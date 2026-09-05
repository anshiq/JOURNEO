from langchain_openai import ChatOpenAI
from app.config import settings
from app.llm.client import get_llm
from app.agents.tool_schemas import TOOL_SCHEMAS
import json, httpx, jsonschema
from app.connectors.java_catalog_client import get_catalog
from app.connectors.registry import dispatch

SYSTEM_PROMPT="You are Studio AI, a helper that turns natural language into structured ad platform actions. Use tools when needed. Be concise."

async def chat(messages: list, campaign_id: str = None):
    llm=get_llm(temperature=0.2)
    # bind tools
    tools=[
        {"type":"function","function":{"name":s["name"],"description":s["description"],"parameters":s["parameters"]}} for s in TOOL_SCHEMAS
    ]
    # Using openai format via langchain
    # We'll call llm with tools
    try:
        bound=llm.bind_tools([{"name":s["name"],"description":s["description"],"parameters":s["parameters"]} for s in TOOL_SCHEMAS])
        # convert messages to langchain
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
        lc_msgs=[SystemMessage(content=SYSTEM_PROMPT)]
        for m in messages:
            if m["role"]=="user": lc_msgs.append(HumanMessage(content=m["content"]))
            else: lc_msgs.append(AIMessage(content=m["content"]))
        res=await bound.ainvoke(lc_msgs)
        tool_calls=getattr(res,"tool_calls",[]) or []
        # handle tool calls with validation and max 2 retries
        results=[]
        for tc in tool_calls:
            name=tc.get("name") or tc.get("function",{}).get("name")
            args=tc.get("args") or json.loads(tc.get("function",{}).get("arguments","{}"))
            schema=next((s for s in TOOL_SCHEMAS if s["name"]==name), None)
            if schema:
                try: jsonschema.validate(args, schema["parameters"])
                except Exception as e:
                    # bounce back to model
                    lc_msgs.append(AIMessage(content="", tool_calls=[tc]))
                    lc_msgs.append(HumanMessage(content=f"Tool validation failed for {name}: {e}. Fix args and retry."))
                    if len(results)<2:
                        res2=await bound.ainvoke(lc_msgs)
                        tool_calls2=getattr(res2,"tool_calls",[]) or []
                        tool_calls.extend(tool_calls2)
                        continue
                    else:
                        results.append({"tool":name,"error":str(e)})
                        continue
            # execute or queue
            if name=="query_data_catalog":
                cat=await get_catalog(args["campaignId"], metrics=args.get("metrics","ctr,cpa"))
                results.append({"tool":name,"result":cat})
            else:
                # risky actions go to approval queue, pause executes directly
                if name in ["create_campaign","reallocate_budget"]:
                    # create proposal
                    from app.db.session import SessionLocal
                    from app.db.models.proposals import ActionProposal
                    db=SessionLocal()
                    prop=ActionProposal(source="studio_ai_chat", campaign_id=args.get("campaignId") or campaign_id or "unknown", proposed_action={"platform":args.get("platform","meta"),"subtype":name,"params":args}, rationale=res.content or f"Studio AI requested {name}", confidence=0.75, estimated_impact="medium", guardrail_status="pass", status="pending", source_analytics_snapshot={}, request_id="")
                    db.add(prop); db.commit(); db.refresh(prop); db.close()
                    results.append({"tool":name,"result":{"queued":True,"proposal_id":prop.id,"requires_approval":True}})
                else:
                    # pause executes directly
                    disp=await dispatch(args.get("platform","meta"), name, args)
                    results.append({"tool":name,"result":disp})
        return {"content":res.content, "tool_calls":tool_calls, "tool_results":results}
    except Exception as e:
        # fallback deterministic
        txt=messages[-1]["content"].lower() if messages else ""
        if "pause" in txt:
            disp=await dispatch("meta","pause_campaign",{"platform":"meta","campaignId":campaign_id or "campaign-a"})
            return {"content":"Pausing campaign as requested","tool_calls":[],"tool_results":[{"tool":"pause_campaign","result":disp}]}
        if "create" in txt:
            from app.db.session import SessionLocal
            from app.db.models.proposals import ActionProposal
            db=SessionLocal()
            prop=ActionProposal(source="studio_ai_chat", campaign_id=campaign_id or "campaign-a", proposed_action={"platform":"meta","subtype":"create_campaign","params":{"platform":"meta","name":"New Campaign"}}, rationale="Studio AI fallback", confidence=0.6, estimated_impact="medium", guardrail_status="pass", status="pending", source_analytics_snapshot={}, request_id="")
            db.add(prop); db.commit(); db.refresh(prop); db.close()
            return {"content":"Created proposal for campaign creation (needs approval)","tool_calls":[],"tool_results":[{"tool":"create_campaign","result":{"queued":True,"proposal_id":prop.id}}]}
        return {"content":f"Studio AI fallback response: {e}","tool_calls":[],"tool_results":[]}
