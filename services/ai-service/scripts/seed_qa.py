#!/usr/bin/env python3
from app.db.session import SessionLocal, Base, engine
from app.db.models.knowledge import KnowledgeSource, DocumentChunk
from app.rag.chunking import chunk_text
from app.rag.embeddings import get_embeddings
from app.rag.vectorstore import add_embeddings, ensure_vector_extension

QA_PAIRS = [
    ("What chip does the iPhone 16 Pro use?", "The iPhone 16 Pro is powered by the A18 Pro chip."),
    ("What is the camera setup on the iPhone 16 Pro?", "The iPhone 16 Pro has a 48MP Fusion main camera and a 5x Telephoto camera."),
    ("What colors does the iPhone 16 Pro come in?", "The iPhone 16 Pro is available in Desert Titanium and Natural Titanium, among other finishes."),
    ("How much does the iPhone 16 Pro cost?", "The iPhone 16 Pro starts at $999. The iPhone 16 Pro Max starts at $1,199."),
    ("Can I trade in my old phone for the iPhone 16 Pro?", "Yes, qualified trade-ins are accepted toward the purchase of an iPhone 16 Pro."),

    ("What midsole does the Nike Air Zoom Pegasus 41 use?", "The Pegasus 41 uses ReactX, Nike's all-new midsole foam, which is 13% more responsive."),
    ("What is the stack height of the Pegasus 41?", "The Pegasus 41 has a stack height of 37mm at the heel and 27mm at the forefoot."),
    ("How much does the Nike Air Zoom Pegasus 41 cost?", "The Nike Air Zoom Pegasus 41 is priced at $140."),
    ("What sizes and widths are available for the Pegasus 41?", "The Pegasus 41 is available in multiple sizes and width options, including standard and wide."),
    ("What do reviews say about the Pegasus 41?", "The Nike Air Zoom Pegasus 41 has a 5.0 star rating on Foot Locker based on 891 reviews."),

    ("What is the price of the Tesla Model Y 2026?", "The 2026 Tesla Model Y starts at $39,990 for the Standard RWD trim and goes up to $61,990 for the Model Y L Launch Series."),
    ("What is the range of the Tesla Model Y Standard RWD?", "The Tesla Model Y Standard RWD has an estimated range of 321 miles."),
    ("How fast does the Tesla Model Y Performance AWD accelerate?", "The Tesla Model Y Performance AWD goes 0-60 mph in 3.3 seconds."),
    ("Does the Model Y L Launch Series have six seats?", "Yes, the Model Y L Launch Series is a six-seat configuration with an estimated 325 mile range."),
    ("How much is the deposit to reserve a Tesla Model Y?", "A $250 refundable deposit is required to reserve a Tesla Model Y."),
]


def seed():
    ensure_vector_extension()
    Base.metadata.create_all(bind=engine)
    emb_model = get_embeddings()
    db = SessionLocal()
    for question, answer in QA_PAIRS:
        qa = f"Q: {question}\nA: {answer}"
        src = KnowledgeSource(type="qa", title=question[:80], uri="qa")
        db.add(src)
        db.commit()
        db.refresh(src)
        chunks = chunk_text(qa, is_qa=True)
        embs = emb_model.embed_documents(chunks)
        for idx, ch in enumerate(chunks):
            dc = DocumentChunk(source_id=src.id, chunk_index=idx, content=ch)
            db.add(dc)
            db.flush()
            add_embeddings([(dc.id, ch)], [embs[idx]])
        db.commit()
    db.close()
    print(f"seeded {len(QA_PAIRS)} qa pairs")


if __name__ == "__main__":
    seed()
