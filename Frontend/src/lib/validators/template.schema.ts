import { z } from "zod";

export const TemplateTypeEnum = z.enum([
    "TEXT",
    "IMAGE",
    "VIDEO",
    "DOCUMENT",
    "LOCATION",
    "CAROUSEL",
    "LIMITED_TIME_OFFER",
    "CATALOG",
]);

export const TemplateCategoryEnum = z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]);

export const ButtonTypeEnum = z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "ONE_TAP", "VOICE_CALL"]);

export const ButtonSchema = z.object({
    type: ButtonTypeEnum,
    text: z.string().min(1, "Button text is required").max(25, "Max 25 chars"),
    url: z.string().optional(),
    phone_number: z.string().optional(),
    example: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
    if (data.type === "URL") {
        if (!data.url) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "URL is required",
                path: ["url"],
            });
        } else {
            const urlResult = z.string().url().safeParse(data.url);
            if (!urlResult.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Invalid URL",
                    path: ["url"],
                });
            }
        }

        if (data.url?.includes("{{1}}") && (!data.example || data.example.length === 0 || !data.example[0])) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "URL example is required when using variables",
                path: ["example", 0],
            });
        }
    }

    if (data.type === "PHONE_NUMBER") {
        if (!data.phone_number) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Phone number is required",
                path: ["phone_number"],
            });
        } else if (!/^\+?\d{8,15}$/.test(data.phone_number)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid phone number (8-15 digits)",
                path: ["phone_number"],
            });
        }
    }
});

export const CarouselCardSchema = z.object({
    header_file: z.any().optional(),
    body_text: z.string().min(1, "Card body is required").max(1024),
    buttons: z.array(ButtonSchema).max(2).optional(),
});

export const TemplateSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
    category: TemplateCategoryEnum,
    language: z.string().min(1, "Language is required"),
    type: TemplateTypeEnum.default("TEXT"),

    // Header
    header_format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION", "NONE"]).optional(),
    header_text: z.string().max(60).optional(),
    header_file: z.any().optional(),
    header_handle: z.string().optional(),

    // Body
    body_text: z.string().min(1, "Body text is required").max(1024),

    // Footer
    footer_text: z.string().max(60).optional(),

    // Buttons
    buttons: z.array(ButtonSchema).max(3).optional(),

    // Carousel specific
    cards: z.array(CarouselCardSchema).min(2).max(10).optional(),

    // Location specific
    location_latitude: z.string().optional(),
    location_longitude: z.string().optional(),
    location_name: z.string().optional(),
    location_address: z.string().optional(),

    // LTO specific
    lto_expiration_time_ms: z.number().optional(),

    // Catalog specific
    catalog_id: z.string().optional(),

    // Variables
    variable_examples: z.record(z.string()).optional(),
})
    .superRefine((data, ctx) => {
        // Conditional Validation based on Type

        if (data.type === "IMAGE" && !data.header_file) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Image is required for Image template",
                path: ["header_file"],
            });
        }

        if (data.type === "VIDEO" && !data.header_file) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Video is required for Video template",
                path: ["header_file"],
            });
        }

        if (data.type === "DOCUMENT" && !data.header_file) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Document is required for Document template",
                path: ["header_file"],
            });
        }

        if (data.type === "CAROUSEL") {
            if (!data.cards || data.cards.length < 2) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Carousel must have at least 2 cards",
                    path: ["cards"],
                });
            }
        }

        if (data.category === "AUTHENTICATION") {
            if (data.buttons && data.buttons.length > 0) {
                const invalidBtn = data.buttons.find(b => !["COPY_CODE", "ONE_TAP"].includes(b.type));
                if (invalidBtn) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Authentication templates only support OTP buttons",
                        path: ["buttons"],
                    });
                }
            }
        } else {
            // Marketing/Utility validation
            if (data.buttons && data.buttons.length > 0) {
                const firstType = data.buttons[0].type;

                // Check for mixed types
                const hasMixedTypes = data.buttons.some(b => {
                    if (firstType === "QUICK_REPLY") return b.type !== "QUICK_REPLY";
                    if (["URL", "PHONE_NUMBER"].includes(firstType)) return !["URL", "PHONE_NUMBER"].includes(b.type);
                    return false;
                });

                if (hasMixedTypes) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Cannot mix Quick Reply and Call to Action buttons",
                        path: ["buttons"],
                    });
                }

                // Limit checks
                if (firstType === "QUICK_REPLY" && data.buttons.length > 3) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Max 3 Quick Reply buttons allowed",
                        path: ["buttons"],
                    });
                }

                if (["URL", "PHONE_NUMBER"].includes(firstType) && data.buttons.length > 2) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Max 2 Call to Action buttons allowed",
                        path: ["buttons"],
                    });
                }
            }
        }
    });

export type TemplateFormData = z.infer<typeof TemplateSchema>;
