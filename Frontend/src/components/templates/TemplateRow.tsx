import { TableCell, TableRow } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Send, Trash2 } from "lucide-react";
import { Template } from "@/api/templates";
import { useRouter } from "next/navigation";

interface TemplateRowProps {
    template: Template;
}

export default function TemplateRow({ template, onSend, onDelete }: {
    template: Template;
    onSend: (template: Template) => void;
    onDelete: (template: Template) => void;
}) {
    const router = useRouter();

    const handleRowClick = () => {
        // router.push(`/templates/${template.id}`); // View details if needed
    };

    return (
        <TableRow
            key={template.id}
            onClick={handleRowClick}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
            <TableCell className="font-medium">{template.name}</TableCell>
            <TableCell>{template.category}</TableCell>
            <TableCell>{template.language}</TableCell>
            <TableCell>
                <Badge
                    variant={
                        template.status === "APPROVED"
                            ? "success"
                            : template.status === "PENDING"
                                ? "warning"
                                : template.status === "REJECTED"
                                    ? "destructive"
                                    : "secondary" // Draft
                    }
                >
                    {template.status}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onSend(template); }}
                        title="Send Template"
                    >
                        <Send className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onDelete(template); }}
                        title="Delete Template"
                    >
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
