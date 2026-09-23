-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "username" VARCHAR(160) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "mimeType" VARCHAR(60) NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siteName" VARCHAR(120) NOT NULL DEFAULT 'Mi Marca',
    "seoTitle" VARCHAR(120) NOT NULL DEFAULT 'Mi Marca',
    "seoDescription" VARCHAR(300) NOT NULL DEFAULT '',
    "theme" JSONB NOT NULL DEFAULT '{}',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'es-MX',
    "catalogTitle" VARCHAR(120) NOT NULL DEFAULT 'Catálogo',
    "catalogSubtitle" VARCHAR(300) NOT NULL DEFAULT '',
    "catalogUrl" VARCHAR(300) NOT NULL DEFAULT '',
    "pdfFooterText" VARCHAR(200) NOT NULL DEFAULT '',
    "logoId" TEXT,
    "faviconId" TEXT,
    "ogImageId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "header_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "brandText" VARCHAR(80) NOT NULL DEFAULT 'Mi Marca',
    "tagline" VARCHAR(120) NOT NULL DEFAULT '',
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showBrand" BOOLEAN NOT NULL DEFAULT true,
    "catalogLabel" VARCHAR(40) NOT NULL DEFAULT 'Catálogo',
    "links" JSONB NOT NULL DEFAULT '[]',
    "ctaText" VARCHAR(40) NOT NULL DEFAULT '',
    "ctaUrl" VARCHAR(300) NOT NULL DEFAULT '',
    "showCta" BOOLEAN NOT NULL DEFAULT false,
    "bgColor" VARCHAR(9) NOT NULL DEFAULT '#FFF8F9',
    "textColor" VARCHAR(9) NOT NULL DEFAULT '#34242A',
    "sticky" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "header_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "text" VARCHAR(500) NOT NULL DEFAULT '',
    "copyright" VARCHAR(160) NOT NULL DEFAULT '',
    "email" VARCHAR(160) NOT NULL DEFAULT '',
    "phone" VARCHAR(40) NOT NULL DEFAULT '',
    "address" VARCHAR(200) NOT NULL DEFAULT '',
    "links" JSONB NOT NULL DEFAULT '[]',
    "socials" JSONB NOT NULL DEFAULT '[]',
    "bgColor" VARCHAR(9) NOT NULL DEFAULT '#F9E1E6',
    "textColor" VARCHAR(9) NOT NULL DEFAULT '#4A3238',
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showContact" BOOLEAN NOT NULL DEFAULT true,
    "showLinks" BOOLEAN NOT NULL DEFAULT true,
    "showSocials" BOOLEAN NOT NULL DEFAULT true,
    "logoId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "footer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sections" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT '',
    "subtitle" VARCHAR(300) NOT NULL DEFAULT '',
    "body" VARCHAR(5000) NOT NULL DEFAULT '',
    "buttonText" VARCHAR(60) NOT NULL DEFAULT '',
    "buttonUrl" VARCHAR(300) NOT NULL DEFAULT '',
    "items" JSONB NOT NULL DEFAULT '[]',
    "imageId" TEXT,
    "bgColor" VARCHAR(9) NOT NULL DEFAULT '',
    "textColor" VARCHAR(9) NOT NULL DEFAULT '',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "image_assets_storageKey_key" ON "image_assets"("storageKey");

-- CreateIndex
CREATE INDEX "products_isActive_sortOrder_idx" ON "products"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "content_sections_visible_sortOrder_idx" ON "content_sections"("visible", "sortOrder");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_faviconId_fkey" FOREIGN KEY ("faviconId") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footer_settings" ADD CONSTRAINT "footer_settings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

