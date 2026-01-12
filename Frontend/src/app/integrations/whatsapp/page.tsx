import ConnectWhatsApp from "@/components/integrations/ConnectWhatsApp";

export default function WhatsAppIntegrationPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">WhatsApp Integration</h1>
            <div className="grid gap-6">
                <ConnectWhatsApp />
            </div>
        </div>
    );
}
