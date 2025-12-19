import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
    Type,
    Image as ImageIcon,
    Video,
    FileText,
    MapPin,
    GalleryHorizontal,
    Clock,
    ShoppingBag
} from "lucide-react";

interface TemplateTypeSelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const TYPES = [
    { id: "TEXT", label: "Text", icon: Type, description: "Standard text message" },
    { id: "IMAGE", label: "Image", icon: ImageIcon, description: "Image with caption" },
    { id: "VIDEO", label: "Video", icon: Video, description: "Video with caption" },
    { id: "DOCUMENT", label: "Document", icon: FileText, description: "PDF or Doc file" },
    { id: "LOCATION", label: "Location", icon: MapPin, description: "Location coordinates" },
    { id: "CAROUSEL", label: "Carousel", icon: GalleryHorizontal, description: "Scrollable cards" },
    { id: "LIMITED_TIME_OFFER", label: "Offer", icon: Clock, description: "Limited time deal" },
    { id: "CATALOG", label: "Catalog", icon: ShoppingBag, description: "Product catalog" },
];

export default function TemplateTypeSelector({ value, onChange, disabled }: TemplateTypeSelectorProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = value === type.id;

                return (
                    <div
                        key={type.id}
                        onClick={() => !disabled && onChange(type.id)}
                        className={cn(
                            "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-accent/50",
                            isSelected ? "border-primary bg-primary/5" : "border-muted bg-card",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Icon className={cn("h-6 w-6 mb-2", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                            {type.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
