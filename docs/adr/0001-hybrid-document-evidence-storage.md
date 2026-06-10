# 0001-hybrid-document-evidence-storage

We have decided to route document evidence uploads containing images to Cloudinary, and other document types (such as PDFs, Office files, and Zip archives) to Supabase Object Storage. We did this because Cloudinary provides specialized optimization and transformation services for images, but is expensive or poorly suited for hosting general documents, whereas Supabase Object Storage is a cost-effective, general-purpose solution for hosting arbitrary file types.
