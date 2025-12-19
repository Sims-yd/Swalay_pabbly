import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TemplateFormData } from "@/lib/validators/template.schema";
import { Copy, MapPin, FileText, Play, Image as ImageIcon } from "lucide-react";

interface TemplatePreviewProps {
    data: Partial<TemplateFormData>;
}

export default function TemplatePreview({ data }: TemplatePreviewProps) {
    const renderPreviewText = (text: string) => {
        if (!text) return null;
        const parts = text.split(/({{\d+}})/g);
        return parts.map((part, i) => {
            if (part.match(/^{{\d+}}$/)) {
                return <span key={i} className="bg-yellow-200 text-yellow-800 px-1 rounded mx-0.5">{part}</span>;
            }
            return part;
        });
    };

    const renderHeader = () => {
        if (data.type === "TEXT" && data.header_text) {
            return (
                <div className="font-bold text-sm mb-1 pb-1">
                    {renderPreviewText(data.header_text)}
                </div>
            );
        }

        if (data.type === "IMAGE") {
            return (
                <div className="w-full h-32 bg-muted rounded-lg mb-2 flex items-center justify-center text-muted">
                    {data.header_file ? (
                        <img src={URL.createObjectURL(data.header_file)} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-primary" />
                    )}
                </div>
            );
        }

        if (data.type === "VIDEO") {
            return (
                <div className="w-full h-32 bg-gray-800 rounded-lg mb-2 flex items-center justify-center text-white">
                    <Play className="h-8 w-8" />
                </div>
            );
        }

        if (data.type === "DOCUMENT") {
            return (
                <div className="w-full h-16 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-500 border border-dashed border-gray-300">
                    <FileText className="h-6 w-6 mr-2" />
                    <span className="text-xs">Document.pdf</span>
                </div>
            );
        }

        if (data.type === "LOCATION") {
            return (
                <div className="w-full h-32 bg-blue-100 rounded-lg mb-2 flex items-center justify-center text-blue-500">
                    <MapPin className="h-8 w-8" />
                </div>
            );
        }

        return null;
    };

    return (
        <div className="sticky top-8">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-[320px] mx-auto bg-[#E5DDD5] rounded-[30px] p-4 min-h-[600px] border-8 border-gray-200 relative shadow-xl overflow-hidden">
                        {/* Status Bar Mock */}
                        <div className="absolute top-0 left-0 right-0 h-6 bg-muted rounded-t-[20px] z-10" />
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-6 bg-muted rounded-b-xl z-10" />

                        {/* Chat Area */}
                        <div className="mt-12 space-y-4">
                            <div className="bg-card rounded-lg p-2 shadow-sm max-w-[90%] relative">
                                {/* Header */}
                                {renderHeader()}

                                {/* Body */}
                                <div className="text-sm text-card-foreground whitespace-pre-wrap">
                                    {data.body_text ? renderPreviewText(data.body_text) : <span className="text-muted italic">Message body...</span>}
                                </div>

                                {/* Footer */}
                                {data.footer_text && (
                                    <div className="text-[10px] text-muted mt-1 pt-1">
                                        {data.footer_text}
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="text-[10px] text-muted text-right mt-1">
                                    12:00 PM
                                </div>
                            </div>

                            {/* Buttons */}
                            {data.buttons && data.buttons.length > 0 && (
                                <div className="space-y-1 max-w-[90%] w-full">
                                    {data.buttons.map((btn, idx) => (
                                        <div key={idx} className="bg-white rounded-lg p-2.5 text-center text-[#00A5F4] text-sm font-medium shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                            {btn.type === "COPY_CODE" && <Copy className="w-4 h-4" />}
                                            {btn.type === "PHONE_NUMBER" && <span className="text-xs">📞</span>}
                                            {btn.type === "URL" && <span className="text-xs">🔗</span>}
                                            {btn.text || "Button Text"}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
