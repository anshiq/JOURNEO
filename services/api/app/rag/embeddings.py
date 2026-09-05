# Lazy embeddings - use sentence-transformers if available, fallback to deterministic semantic fake
_model=None
class DeterministicFake:
    def __init__(self, size=384):
        self.size=size
    def _embed(self, text: str):
        import re, hashlib, math
        # simple bag-of-words hashed to vector
        vec=[0.0]*self.size
        words=re.findall(r'\w+', text.lower())
        for w in words:
            # hash word to index
            h=int(hashlib.md5(w.encode()).hexdigest(),16) % self.size
            vec[h]+=1.0
        # also add bigram? simple
        # normalize
        norm=math.sqrt(sum(x*x for x in vec)) or 1
        return [x/norm for x in vec]
    def embed_query(self, text: str):
        return self._embed(text)
    def embed_documents(self, texts):
        return [self._embed(t) for t in texts]
    async def aembed_query(self, text: str):
        return self.embed_query(text)
    async def aembed_documents(self, texts):
        return self.embed_documents(texts)

def get_embeddings():
    global _model
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        if _model is None:
            _model=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        _model.embed_query("test")
        return _model
    except Exception as e:
        print(f"embeddings fallback: {e}")
        return DeterministicFake(size=384)
