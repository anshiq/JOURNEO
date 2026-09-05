from langchain_text_splitters import RecursiveCharacterTextSplitter
def get_splitter():
    return RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100, separators=["\n\n","\n"," ",""])
def chunk_text(text: str, is_qa=False):
    if is_qa: return [text]  # never split QA pairs
    splitter=get_splitter()
    return splitter.split_text(text)
