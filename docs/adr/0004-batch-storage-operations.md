# 0004-batch-storage-operations

We have decided to implement batch upload and batch deletion capabilities in both the file storage providers (Cloudinary and Supabase) and our upload API endpoints. We did this to optimize network performance and reduce round-trip latency when members attach multiple evidence documents to a time log or clean up multiple files during log deletion.
