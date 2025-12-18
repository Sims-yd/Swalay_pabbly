import { useState, useEffect } from "react";
import { Control, useFieldArray, UseFormSetValue } from "react-hook-form";
import { TemplateFormData } from "@/lib/validators/template.schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import ButtonEditor from "./ButtonEditor";

interface InteractiveActionsProps {
    control: Control<TemplateFormData>;
    setValue: UseFormSetValue<TemplateFormData>;
    errors: any;
    disabled?: boolean;
}

export default function InteractiveActions({ control, setValue, errors, disabled }: InteractiveActionsProps) {
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "buttons",
    });

    const [actionType, setActionType] = useState<"NONE" | "QUICK_REPLY" | "CTA">("NONE");

    // Sync local state with form data on mount
    useEffect(() => {
        if (fields.length > 0) {
            const firstType = fields[0].type;
            if (firstType === "QUICK_REPLY") {
                setActionType("QUICK_REPLY");
            } else if (["URL", "PHONE_NUMBER"].includes(firstType)) {
                setActionType("CTA");
            }
        } else {
            setActionType("NONE");
        }
    }, []); // Run once on mount

    const handleTypeChange = (value: "NONE" | "QUICK_REPLY" | "CTA") => {
        setActionType(value);
        if (value === "NONE") {
            replace([]);
        } else if (value === "QUICK_REPLY") {
            replace([{ type: "QUICK_REPLY", text: "" }]);
        } else if (value === "CTA") {
            replace([{ type: "URL", text: "", url: "" }]);
        }
    };

    const handleAddButton = () => {
        if (actionType === "QUICK_REPLY" && fields.length < 3) {
            append({ type: "QUICK_REPLY", text: "" });
        } else if (actionType === "CTA" && fields.length < 2) {
            append({ type: "URL", text: "", url: "" });
        }
    };

    if (disabled) return null;

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-base font-medium">Interactive Actions</Label>
                <RadioGroup
                    value={actionType}
                    onValueChange={(val: any) => handleTypeChange(val)}
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NONE" id="none" />
                        <Label htmlFor="none">None</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="QUICK_REPLY" id="quick_reply" />
                        <Label htmlFor="quick_reply">Quick Replies</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CTA" id="cta" />
                        <Label htmlFor="cta">Call to Action</Label>
                    </div>
                </RadioGroup>
            </div>

            {actionType !== "NONE" && (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <ButtonEditor
                            key={field.id}
                            index={index}
                            control={control}
                            remove={remove}
                            mode={actionType}
                            errors={errors}
                        />
                    ))}

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddButton}
                            disabled={
                                (actionType === "QUICK_REPLY" && fields.length >= 3) ||
                                (actionType === "CTA" && fields.length >= 2)
                            }
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add Button
                        </Button>
                    </div>

                    {errors.buttons && !Array.isArray(errors.buttons) && (
                        <p className="text-xs text-destructive">{errors.buttons.message}</p>
                    )}
                </div>
            )}
        </div>
    );
}
