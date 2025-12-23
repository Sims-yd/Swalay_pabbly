import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Template } from "@/api/templates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Trash2, Plus, Info, Copy } from "lucide-react";
import { Combobox } from "@/components/ui/Combobox";
import TemplateTypeSelector from "./TemplateTypeSelector";
import TemplatePreview from "./TemplatePreview";
import { TemplateSchema, TemplateFormData } from "@/lib/validators/template.schema";
import { mapFormToPayload } from "@/lib/templateMapper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InteractiveActions from "./InteractiveActions";
import { startUpload, finishUpload } from "@/api/whatsappApi";
import { useToast } from "@/components/ui/use-toast";

interface TemplateFormProps {
    initialData?: Template;
    onSubmit: (data: any) => Promise<void>;
    isSubmitting: boolean;
}

const LANGUAGES = [
    { label: "English (US)", value: "en_US" },
    { label: "English (UK)", value: "en_GB" },
    { label: "Hindi", value: "hi" },
    { label: "Arabic", value: "ar" },
    { label: "Spanish", value: "es" },
    { label: "Portuguese (BR)", value: "pt_BR" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Italian", value: "it" },
    { label: "Indonesian", value: "id" },
    { label: "Malay", value: "ms" },
    { label: "Thai", value: "th" },
    { label: "Vietnamese", value: "vi" },
    { label: "Turkish", value: "tr" },
    { label: "Russian", value: "ru" },
    { label: "Japanese", value: "ja" },
    { label: "Korean", value: "ko" },
    { label: "Chinese (Simplified)", value: "zh_CN" },
    { label: "Chinese (Traditional)", value: "zh_TW" },
];

export default function TemplateForm({ initialData, onSubmit, isSubmitting }: TemplateFormProps) {
    const form = useForm<TemplateFormData>({
        resolver: zodResolver(TemplateSchema),
        defaultValues: {
            name: initialData?.name || "",
            category: (initialData?.category as any) || "MARKETING",
            language: initialData?.language || "en_US",
            type: "TEXT",
            body_text: "",
            buttons: [],
        }
    });

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = form;

    const category = watch("category");
    const type = watch("type");
    const bodyText = watch("body_text");
    const headerText = watch("header_text");
    const buttons = watch("buttons") || [];
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    // Variable parsing logic
    const [bodyVariables, setBodyVariables] = useState<string[]>([]);
    const [headerVariables, setHeaderVariables] = useState<string[]>([]);
    const [variableExamples, setVariableExamples] = useState<Record<string, string>>({});

    useEffect(() => {
        const parseVariables = (text: string) => {
            if (!text) return [];
            const regex = /{{\s*(\d+)\s*}}/g;
            const matches = [...text.matchAll(regex)];
            return matches.map(m => m[1]);
        };

        const bodyVars = parseVariables(bodyText || "");
        const headerVars = parseVariables(headerText || "");

        setBodyVariables(bodyVars);
        setHeaderVariables(headerVars);
    }, [bodyText, headerText]);

    const handleExampleChange = (variable: string, value: string) => {
        setVariableExamples(prev => ({
            ...prev,
            [variable]: value
        }));
        setValue("variable_examples", { ...variableExamples, [variable]: value });
    };

    const handleFormSubmit = async (data: TemplateFormData) => {
        const payload = mapFormToPayload(data);
        await onSubmit(payload);
    };

    const handleAddButton = () => {
        if (buttons.length < 3) {
            setValue("buttons", [...buttons, { type: "QUICK_REPLY", text: "" }]);
        }
    };

    const handleAddOtpButton = () => {
        if (buttons.length < 1) {
            setValue("buttons", [{ type: "COPY_CODE", text: "Copy Code" }]);
        }
    };

    const handleRemoveButton = (index: number) => {
        setValue("buttons", buttons.filter((_, i) => i !== index));
    };

    const handleButtonChange = (index: number, field: string, value: any) => {
        const newButtons = [...buttons];
        // @ts-ignore
        newButtons[index][field] = value;
        setValue("buttons", newButtons);
    };

    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const startRes = await startUpload(file.size, file.type);
            const sessionId = startRes.id;

            const finishRes = await finishUpload(sessionId, file);
            const handle = finishRes.h;

            setValue("header_handle", handle);
            toast({ title: "Upload successful", description: "Media uploaded to Meta." });
        } catch (error) {
            console.error(error);
            toast({ title: "Upload failed", description: "Failed to upload media.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Template Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Template Name</label>
                            <Input
                                {...register("name")}
                                placeholder="e.g., welcome_message"
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                            <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and underscores.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Controller
                                    control={control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MARKETING">Marketing</SelectItem>
                                                <SelectItem value="UTILITY">Utility</SelectItem>
                                                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Language</label>
                                <Controller
                                    control={control}
                                    name="language"
                                    render={({ field }) => (
                                        <Combobox
                                            options={LANGUAGES}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select language"
                                            searchPlaceholder="Search language..."
                                            emptyText="No language found."
                                        />
                                    )}
                                />
                                {errors.language && <p className="text-xs text-destructive">{errors.language.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Template Type</label>
                            <Controller
                                control={control}
                                name="type"
                                render={({ field }) => (
                                    <TemplateTypeSelector
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={category === "AUTHENTICATION"}
                                    />
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Header Section */}
                        {type === "TEXT" && category !== "AUTHENTICATION" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Header (Optional)</label>
                                <Input
                                    {...register("header_text")}
                                    placeholder="Header text..."
                                    maxLength={60}
                                />
                            </div>
                        )}

                        {["IMAGE", "VIDEO", "DOCUMENT"].includes(type) && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Header Media</label>
                                <Input
                                    type="file"
                                    accept={type === "IMAGE" ? "image/*" : type === "VIDEO" ? "video/*" : ".pdf,.doc,.docx"}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setValue("header_file", file);
                                            await handleFileUpload(file);
                                        }
                                    }}
                                    disabled={isUploading}
                                />
                                {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                                {errors.header_file && <p className="text-xs text-destructive">{errors.header_file.message as string}</p>}
                            </div>
                        )}

                        {type === "LOCATION" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Latitude</label>
                                    <Input
                                        {...register("location_latitude")}
                                        placeholder="e.g., 37.7749"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Longitude</label>
                                    <Input
                                        {...register("location_longitude")}
                                        placeholder="e.g., -122.4194"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Body Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Body</label>
                            <textarea
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register("body_text")}
                                placeholder="Enter your message body here... Use {{1}} for variables."
                            />
                            {errors.body_text && <p className="text-xs text-destructive">{errors.body_text.message}</p>}
                        </div>

                        {/* Footer Section */}
                        {category !== "AUTHENTICATION" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Footer (Optional)</label>
                                <Input
                                    {...register("footer_text")}
                                    placeholder="Footer text..."
                                    maxLength={60}
                                />
                            </div>
                        )}

                        {/* Buttons Section */}
                        <div className="space-y-2">
                            {category === "AUTHENTICATION" ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium">OTP Button</label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddOtpButton}
                                            disabled={buttons.length >= 1}
                                        >
                                            <Plus className="h-4 w-4 mr-1" /> Add OTP Button
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {buttons.map((btn, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Select
                                                    value={btn.type}
                                                    onValueChange={(val) => handleButtonChange(idx, "type", val)}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="COPY_CODE">Copy Code</SelectItem>
                                                        <SelectItem value="ONE_TAP">One Tap</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    value={btn.text}
                                                    onChange={(e) => handleButtonChange(idx, "text", e.target.value)}
                                                    placeholder="Button Text"
                                                    maxLength={25}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/90"
                                                    onClick={() => handleRemoveButton(idx)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <InteractiveActions
                                    control={control}
                                    setValue={setValue}
                                    errors={errors}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Variable Examples */}
                {(bodyVariables.length > 0 || headerVariables.length > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Variable Examples</CardTitle>
                            <p className="text-sm text-muted-foreground">Provide example values for your variables (Required by Meta).</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {headerVariables.map((v, i) => (
                                <div key={`header-${v}-${i}`} className="grid grid-cols-[100px_1fr] items-center gap-4">
                                    <label className="text-sm font-medium text-right">{v} (Header):</label>
                                    <Input
                                        value={variableExamples[v] || ""}
                                        onChange={(e) => handleExampleChange(v, e.target.value)}
                                        placeholder={`Example for ${v}`}
                                        required
                                    />
                                </div>
                            ))}
                            {bodyVariables.map((v, i) => (
                                <div key={`body-${v}-${i}`} className="grid grid-cols-[100px_1fr] items-center gap-4">
                                    <label className="text-sm font-medium text-right">{v} (Body):</label>
                                    <Input
                                        value={variableExamples[v] || ""}
                                        onChange={(e) => handleExampleChange(v, e.target.value)}
                                        placeholder={`Example for ${v}`}
                                        required
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? "Creating..." : "Submit Template"}
                    </Button>
                </div>
            </form>

            {/* Right Column: Preview */}
            <div className="hidden lg:block">
                <TemplatePreview data={watch()} />
            </div>
        </div>
    );
}
