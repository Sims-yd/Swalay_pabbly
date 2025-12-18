import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { Control, Controller } from "react-hook-form";
import { TemplateFormData } from "@/lib/validators/template.schema";

interface ButtonEditorProps {
    index: number;
    control: Control<TemplateFormData>;
    remove: (index: number) => void;
    mode: "QUICK_REPLY" | "CTA";
    errors?: any;
}

export default function ButtonEditor({ index, control, remove, mode, errors }: ButtonEditorProps) {
    return (
        <div className="flex gap-2 items-start p-3 border rounded-md bg-muted/20">
            <div className="grid gap-3 flex-1">
                {mode === "CTA" && (
                    <div className="grid grid-cols-2 gap-2">
                        <Controller
                            control={control}
                            name={`buttons.${index}.type`}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PHONE_NUMBER">Phone Number</SelectItem>
                                        <SelectItem value="URL">Visit Website</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        <Controller
                            control={control}
                            name={`buttons.${index}.text`}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    placeholder="Button Text"
                                    maxLength={25}
                                />
                            )}
                        />
                    </div>
                )}

                {mode === "QUICK_REPLY" && (
                    <Controller
                        control={control}
                        name={`buttons.${index}.text`}
                        render={({ field }) => (
                            <Input
                                {...field}
                                placeholder="Button Text"
                                maxLength={25}
                            />
                        )}
                    />
                )}

                {/* Conditional Inputs for CTA */}
                <Controller
                    control={control}
                    name={`buttons.${index}.type`}
                    render={({ field: typeField }) => {
                        if (typeField.value === "URL") {
                            return (
                                <Controller
                                    control={control}
                                    name={`buttons.${index}.url`}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="https://example.com"
                                        />
                                    )}
                                />
                            );
                        }
                        if (typeField.value === "PHONE_NUMBER") {
                            return (
                                <Controller
                                    control={control}
                                    name={`buttons.${index}.phone_number`}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="+1234567890"
                                        />
                                    )}
                                />
                            );
                        }
                        return null;
                    }}
                />

                {/* Error Display */}
                {errors?.buttons?.[index] && (
                    <div className="text-xs text-destructive space-y-1">
                        {errors.buttons[index]?.text && <p>{errors.buttons[index].text.message}</p>}
                        {errors.buttons[index]?.url && <p>{errors.buttons[index].url.message}</p>}
                        {errors.buttons[index]?.phone_number && <p>{errors.buttons[index].phone_number.message}</p>}
                    </div>
                )}
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/90 mt-1"
                onClick={() => remove(index)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}
