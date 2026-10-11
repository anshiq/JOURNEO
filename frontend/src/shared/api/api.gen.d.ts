export interface paths {
    "/api/v1/ai/alt-text": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["alt_text_api_v1_ai_alt_text_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ai/rewrite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["rewrite_api_v1_ai_rewrite_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ai/rewrite-screen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["rewrite_screen_api_v1_ai_rewrite_screen_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ai/theme": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["theme_api_v1_ai_theme_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_campaigns_api_v1_campaigns_get"];
        put?: never;
        
        post: operations["create_campaign_api_v1_campaigns_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["get_campaign_api_v1_campaigns__campaign_id__get"];
        put?: never;
        post?: never;
        
        delete: operations["delete_campaign_api_v1_campaigns__campaign_id__delete"];
        options?: never;
        head?: never;
        
        patch: operations["patch_campaign_api_v1_campaigns__campaign_id__patch"];
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/duplicate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["duplicate_campaign_api_v1_campaigns__campaign_id__duplicate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["get_workspace_api_v1_campaigns__campaign_id__journey_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/checkpoints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_checkpoints_api_v1_campaigns__campaign_id__journey_checkpoints_get"];
        put?: never;
        
        post: operations["create_checkpoint_api_v1_campaigns__campaign_id__journey_checkpoints_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/checkpoints/{checkpoint_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["get_checkpoint_api_v1_campaigns__campaign_id__journey_checkpoints__checkpoint_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        
        put: operations["put_draft_api_v1_campaigns__campaign_id__journey_draft_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/editor-state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        
        put: operations["set_editor_state_api_v1_campaigns__campaign_id__journey_editor_state_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["start_generate_api_v1_campaigns__campaign_id__journey_generate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/generate/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["generate_status_api_v1_campaigns__campaign_id__journey_generate__job_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/generate/{job_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["cancel_generate_api_v1_campaigns__campaign_id__journey_generate__job_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/ops": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        
        put: operations["set_ops_api_v1_campaigns__campaign_id__journey_ops_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["publish_api_v1_campaigns__campaign_id__journey_publish_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["restore_api_v1_campaigns__campaign_id__journey_restore_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["validate_doc_api_v1_campaigns__campaign_id__journey_validate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_versions_api_v1_campaigns__campaign_id__journey_versions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/journey/versions/{version_no}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["get_version_api_v1_campaigns__campaign_id__journey_versions__version_no__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/knowledge/playground": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["playground_api_v1_campaigns__campaign_id__knowledge_playground_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/knowledge/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_sources_api_v1_campaigns__campaign_id__knowledge_sources_get"];
        put?: never;
        
        post: operations["add_source_api_v1_campaigns__campaign_id__knowledge_sources_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/knowledge/sources/pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["add_pdf_api_v1_campaigns__campaign_id__knowledge_sources_pdf_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/knowledge/sources/{source_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        
        delete: operations["delete_source_api_v1_campaigns__campaign_id__knowledge_sources__source_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/knowledge/sources/{source_id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["retry_source_api_v1_campaigns__campaign_id__knowledge_sources__source_id__retry_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_leads_api_v1_campaigns__campaign_id__leads_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/leads.csv": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["leads_csv_api_v1_campaigns__campaign_id__leads_csv_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/leads/test-webhook": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["test_webhook_api_v1_campaigns__campaign_id__leads_test_webhook_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/preview-link/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["reset_preview_link_api_v1_campaigns__campaign_id__preview_link_reset_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/results": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["results_api_v1_campaigns__campaign_id__results_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/save-as-template": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["save_as_template_api_v1_campaigns__campaign_id__save_as_template_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaign_id}/slug-available": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["slug_available_api_v1_campaigns__campaign_id__slug_available_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["upload_api_v1_files_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["import_image_api_v1_files_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files/video-presign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["video_presign_api_v1_files_video_presign_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["get_file_api_v1_files__key__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/library/presets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_presets_api_v1_library_presets_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/library/recipes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_recipes_api_v1_library_recipes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/library/templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["list_templates_api_v1_library_templates_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/library/templates/{template_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["get_template_api_v1_library_templates__template_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/media/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["stock_search_api_v1_media_search_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/campaigns/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["public_doc_api_v1_public_campaigns__slug__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/dev/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["dev_doc_api_v1_public_dev__token__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/page/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["public_page_api_v1_public_page__slug__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["upsert_session_api_v1_public_sessions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/sessions/{session_id}/assist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["assist_api_v1_public_sessions__session_id__assist_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/sessions/{session_id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["ingest_events_api_v1_public_sessions__session_id__events_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/public/sessions/{session_id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        
        post: operations["submit_api_v1_public_sessions__session_id__submit_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        
        get: operations["ready_ready_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        
        AltTextBody: {
            
            url: string;
        };
        
        AssistBody: {
            
            question: string;
            
            stepId?: string | null;
        };
        
        Body_add_pdf_api_v1_campaigns__campaign_id__knowledge_sources_pdf_post: {
            
            file: string;
            
            title?: string | null;
        };
        
        Body_upload_api_v1_files_post: {
            
            file: string;
        };
        
        Brand: {
            
            color?: string | null;
            
            logoFileKey?: string | null;
            
            logoUrl?: string | null;
        };
        
        CheckpointBody: {
            
            reason: "manual" | "ai_restyle";
        };
        
        CreateBody: {
            
            audience?: string | null;
            brand?: components["schemas"]["Brand"] | null;
            
            brief?: string | null;
            
            goal?: ("leads" | "recommend" | "giveaway" | "event" | "feedback" | "offer" | "waitlist") | null;
            
            name?: string | null;
            
            start: components["schemas"]["Start"];
            
            tone?: string | null;
            
            websiteUrl?: string | null;
        };
        
        DraftBody: {
            
            baseRevision: number;
            
            doc: {
                [key: string]: unknown;
            };
        };
        
        EditorStateBody: {
            
            checklist?: {
                [key: string]: boolean;
            };
            
            coachmarks?: {
                [key: string]: boolean;
            };
            
            dismissedIssues?: string[];
        };
        
        Ended: {
            
            kind: "message" | "redirect";
            
            message?: string | null;
            
            url?: string | null;
        };
        
        GenerateBody: {
            
            audience?: string | null;
            
            brief?: string | null;
            
            goal?: ("leads" | "recommend" | "giveaway" | "event" | "feedback" | "offer" | "waitlist") | null;
            
            tone?: string | null;
            
            websiteUrl?: string | null;
        };
        
        HTTPValidationError: {
            
            detail?: components["schemas"]["ValidationError"][];
        };
        
        ImportBody: {
            
            url: string;
        };
        
        LeadsWebhook: {
            
            enabled: boolean;
            
            url: string;
        };
        
        OpsBody: {
            
            clearEndsAt: boolean;
            
            clearLeadsWebhook: boolean;
            ended?: components["schemas"]["Ended"] | null;
            
            endsAt?: string | null;
            leadsWebhook?: components["schemas"]["LeadsWebhook"] | null;
            
            paused?: boolean | null;
        };
        
        PatchBody: {
            
            archived?: boolean | null;
            
            audience?: string | null;
            
            brief?: string | null;
            
            goal?: ("leads" | "recommend" | "giveaway" | "event" | "feedback" | "offer" | "waitlist") | null;
            
            name?: string | null;
            
            slug?: string | null;
        };
        
        PlaygroundBody: {
            
            question: string;
        };
        
        PublishBody: {
            
            notes?: string | null;
            
            revision: number;
        };
        
        RestoreBody: {
            
            checkpointId?: string | null;
            
            versionNo?: number | null;
        };
        
        RewriteBody: {
            
            instruction?: string | null;
            
            kind: "heading" | "text" | "button" | "option" | "label";
            
            text: string;
            
            voice?: string | null;
        };
        
        RewriteScreenBody: {
            
            instruction?: string | null;
            
            texts: components["schemas"]["ScreenText"][];
            
            voice?: string | null;
        };
        
        SaveTemplateBody: {
            
            name: string;
        };
        
        ScreenText: {
            
            id: string;
            
            limit: number;
            
            text: string;
        };
        
        SessionBody: {
            
            campaignId: string;
            
            devToken?: string | null;
            
            device?: ("mobile" | "tablet" | "desktop") | null;
            
            id: string;
            
            locale?: string | null;
            
            referrer?: string | null;
            
            utm?: {
                [key: string]: string;
            };
            
            versionId?: string | null;
        };
        
        SourceBody: {
            
            answer?: string | null;
            
            kind: "url" | "qa";
            
            question?: string | null;
            
            title?: string | null;
            
            url?: string | null;
        };
        
        Start: {
            
            mode: "blank" | "template" | "ai";
            
            templateId?: string | null;
        };
        
        SubmitBody: {
            
            answers?: {
                [key: string]: unknown;
            };
            
            consent?: {
                [key: string]: unknown;
            } | null;
            
            elementId: string;
            
            hp?: string | null;
            
            stepId: string;
        };
        
        ThemeBody: {
            
            prompt?: string | null;
            
            websiteUrl?: string | null;
        };
        
        ValidateBody: {
            
            doc: {
                [key: string]: unknown;
            };
        };
        
        ValidationError: {
            
            ctx?: Record<string, never>;
            
            input?: unknown;
            
            loc: (string | number)[];
            
            msg: string;
            
            type: string;
        };
        
        VideoBody: {
            
            contentType: string;
            
            filename: string;
            
            size: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    alt_text_api_v1_ai_alt_text_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AltTextBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    rewrite_api_v1_ai_rewrite_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RewriteBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    rewrite_screen_api_v1_ai_rewrite_screen_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RewriteScreenBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    theme_api_v1_ai_theme_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ThemeBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_campaigns_api_v1_campaigns_get: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_campaign_api_v1_campaigns_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateBody"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_campaign_api_v1_campaigns__campaign_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_campaign_api_v1_campaigns__campaign_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    patch_campaign_api_v1_campaigns__campaign_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PatchBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    duplicate_campaign_api_v1_campaigns__campaign_id__duplicate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_workspace_api_v1_campaigns__campaign_id__journey_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_checkpoints_api_v1_campaigns__campaign_id__journey_checkpoints_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_checkpoint_api_v1_campaigns__campaign_id__journey_checkpoints_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CheckpointBody"] | null;
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_checkpoint_api_v1_campaigns__campaign_id__journey_checkpoints__checkpoint_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
                checkpoint_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    put_draft_api_v1_campaigns__campaign_id__journey_draft_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DraftBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    set_editor_state_api_v1_campaigns__campaign_id__journey_editor_state_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EditorStateBody"];
            };
        };
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    start_generate_api_v1_campaigns__campaign_id__journey_generate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerateBody"];
            };
        };
        responses: {
            
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    generate_status_api_v1_campaigns__campaign_id__journey_generate__job_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_generate_api_v1_campaigns__campaign_id__journey_generate__job_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    set_ops_api_v1_campaigns__campaign_id__journey_ops_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OpsBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    publish_api_v1_campaigns__campaign_id__journey_publish_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublishBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    restore_api_v1_campaigns__campaign_id__journey_restore_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RestoreBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    validate_doc_api_v1_campaigns__campaign_id__journey_validate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ValidateBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_versions_api_v1_campaigns__campaign_id__journey_versions_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_version_api_v1_campaigns__campaign_id__journey_versions__version_no__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
                version_no: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    playground_api_v1_campaigns__campaign_id__knowledge_playground_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlaygroundBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_sources_api_v1_campaigns__campaign_id__knowledge_sources_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    add_source_api_v1_campaigns__campaign_id__knowledge_sources_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SourceBody"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    add_pdf_api_v1_campaigns__campaign_id__knowledge_sources_pdf_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_add_pdf_api_v1_campaigns__campaign_id__knowledge_sources_pdf_post"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_source_api_v1_campaigns__campaign_id__knowledge_sources__source_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
                source_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    retry_source_api_v1_campaigns__campaign_id__knowledge_sources__source_id__retry_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
                source_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_leads_api_v1_campaigns__campaign_id__leads_get: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string | null;
                test?: boolean;
            };
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    leads_csv_api_v1_campaigns__campaign_id__leads_csv_get: {
        parameters: {
            query?: {
                test?: boolean;
            };
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    test_webhook_api_v1_campaigns__campaign_id__leads_test_webhook_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reset_preview_link_api_v1_campaigns__campaign_id__preview_link_reset_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    results_api_v1_campaigns__campaign_id__results_get: {
        parameters: {
            query?: {
                range?: "7d" | "30d" | "all";
            };
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_as_template_api_v1_campaigns__campaign_id__save_as_template_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveTemplateBody"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    slug_available_api_v1_campaigns__campaign_id__slug_available_get: {
        parameters: {
            query: {
                slug: string;
            };
            header?: never;
            path: {
                campaign_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    upload_api_v1_files_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_api_v1_files_post"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    import_image_api_v1_files_import_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportBody"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    video_presign_api_v1_files_video_presign_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VideoBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_file_api_v1_files__key__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_presets_api_v1_library_presets_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    list_recipes_api_v1_library_recipes_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    list_templates_api_v1_library_templates_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    get_template_api_v1_library_templates__template_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                template_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    stock_search_api_v1_media_search_get: {
        parameters: {
            query: {
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    public_doc_api_v1_public_campaigns__slug__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    dev_doc_api_v1_public_dev__token__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    public_page_api_v1_public_page__slug__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/html": string;
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    upsert_session_api_v1_public_sessions_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SessionBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    assist_api_v1_public_sessions__session_id__assist_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssistBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ingest_events_api_v1_public_sessions__session_id__events_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    submit_api_v1_public_sessions__session_id__submit_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitBody"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    ready_ready_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
}
