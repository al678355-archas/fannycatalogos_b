-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "contactHours" VARCHAR(500) NOT NULL DEFAULT '',
ADD COLUMN     "contactMapUrl" VARCHAR(500) NOT NULL DEFAULT '',
ADD COLUMN     "contactSubtitle" VARCHAR(300) NOT NULL DEFAULT 'Estamos para ayudarte',
ADD COLUMN     "contactText" VARCHAR(2000) NOT NULL DEFAULT '',
ADD COLUMN     "contactTitle" VARCHAR(120) NOT NULL DEFAULT 'Contáctanos',
ADD COLUMN     "contactWhatsapp" VARCHAR(20) NOT NULL DEFAULT '',
ADD COLUMN     "contactWhatsappMessage" VARCHAR(300) NOT NULL DEFAULT 'Hola, me gustaría obtener más información.';

-- AlterTable
ALTER TABLE "header_settings" ADD COLUMN     "showAdminLink" BOOLEAN NOT NULL DEFAULT true;


-- Los botones "Contáctanos" ahora llevan a la nueva página /contacto
UPDATE "header_settings" SET "ctaUrl" = '/contacto' WHERE "ctaUrl" = '#contacto';
UPDATE "content_sections" SET "buttonUrl" = '/contacto' WHERE "buttonUrl" = '#contacto';
