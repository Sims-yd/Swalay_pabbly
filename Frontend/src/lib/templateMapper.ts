import { TemplateFormData } from "./validators/template.schema";

export const mapFormToPayload = (data: TemplateFormData) => {
    const components: any[] = [];

    // Header
    if (data.type === "TEXT" && data.header_text) {
        components.push({
            type: "HEADER",
            format: "TEXT",
            text: data.header_text,
            // Add example if variables exist (logic handled in form usually, but can be refined here)
        });
    } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(data.type)) {
        components.push({
            type: "HEADER",
            format: data.type,
            // In a real app, we'd upload the file and get a handle. 
            // For now, we might send a placeholder or assume the backend handles the file.
            // Pabbly/Meta often requires an example file handle for creation.
            example: {
                header_handle: ["4::aW..."] // Placeholder handle
            }
        });
    } else if (data.type === "LOCATION") {
        components.push({
            type: "HEADER",
            format: "LOCATION"
        });
    }

    // Body
    if (data.body_text) {
        const bodyComponent: any = {
            type: "BODY",
            text: data.body_text,
        };
        // Example mapping for variables would happen here
        if (data.variable_examples && Object.keys(data.variable_examples).length > 0) {
            // Logic to extract body variables and map them to example.body_text
            // This requires parsing the body text again or passing the parsed vars
        }
        components.push(bodyComponent);
    }

    // Footer
    if (data.footer_text && data.category !== "AUTHENTICATION") {
        components.push({
            type: "FOOTER",
            text: data.footer_text,
        });
    }

    // Buttons
    if (data.buttons && data.buttons.length > 0) {
        components.push({
            type: "BUTTONS",
            buttons: data.buttons.map(b => {
                const btn: any = {
                    type: b.type,
                    text: b.text,
                };

                if (b.type === "URL") {
                    btn.url = b.url;
                }

                if (b.type === "PHONE_NUMBER") {
                    btn.phone_number = b.phone_number;
                }

                return btn;
            })
        });
    }

    // Carousel
    if (data.type === "CAROUSEL" && data.cards) {
        components.push({
            type: "CAROUSEL",
            cards: data.cards.map(card => ({
                header: {
                    format: "IMAGE",
                    // example handle
                },
                body: {
                    text: card.body_text
                },
                buttons: card.buttons
            }))
        });
    }

    return {
        name: data.name,
        category: data.category,
        language: data.language,
        components,
    };
};
