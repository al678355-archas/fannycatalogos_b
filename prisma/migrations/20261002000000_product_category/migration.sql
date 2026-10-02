-- Categoría de producto (agrupa el catálogo público y el PDF)
ALTER TABLE "products" ADD COLUMN "category" VARCHAR(80) NOT NULL DEFAULT '';
