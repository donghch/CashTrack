import { Hono } from "hono";

const ocrRoutes = new Hono<{ Bindings: Env }>();

ocrRoutes.post("/", async (c) => {
    try {
        const contentType = c.req.header("Content-Type");
        if (!contentType || !contentType.includes("multipart/form-data")) {
            return c.json(
                {
                    success: false,
                    error: "Content-Type must be multipart/form-data",
                },
                400,
            );
        }
        const formData = await c.req.formData();
        const imageFile = formData.get("image");

        if (!imageFile || !(imageFile instanceof File)) {
            return c.json(
                { success: false, error: "No image file provided" },
                400,
            );
        }

        if (imageFile.size === 0) {
            return c.json(
                { success: false, error: "Image file is empty" },
                400,
            );
        }

        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (imageFile.size > MAX_SIZE) {
            return c.json(
                { success: false, error: "Image size exceeds 10MB limit" },
                400,
            );
        }

        const userId = c.req.header("X-User-ID");
        if (!userId) {
            return c.json(
                { success: false, error: "User ID header is required" },
                400,
            );
        }

        const originalName = imageFile.name || "image";
        const extension = originalName.includes(".")
            ? originalName.slice(originalName.lastIndexOf("."))
            : ".jpg";
        const uniqueKey = `${Date.now()}-${Math.random().toString(36).substring(2)}${extension}`;

        const bucket = c.env.RECEIPT_IMAGES;
        await bucket.put(uniqueKey, imageFile, {
            httpMetadata: { contentType: imageFile.type },
            customMetadata: { userId },
        });

        let signedUrl: string;
        if (typeof (bucket as any).getSignedUrl === "function") {
            signedUrl = await (bucket as any).getSignedUrl(uniqueKey, {
                expiresIn: 604800, // 7 days in seconds
            });
        } else {
            // Local development fallback: generate a placeholder URL
            console.warn(
                "R2Bucket.getSignedUrl not available, using placeholder URL",
            );
            signedUrl = `http://localhost:8787/placeholder/${uniqueKey}`;
        }

        return c.json(
            {
                success: true,
                signedUrl,
                key: uniqueKey,
            },
            201,
        );
    } catch (error) {
        console.error("OCR upload error:", error);
        return c.json({ success: false, error: "Failed to upload image" }, 500);
    }
});

export default ocrRoutes;
