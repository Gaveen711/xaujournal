import { AppDialog } from './app/AppDialog';
import { Button } from './ui/button';

export function ProTermsModal({ onAccept, onClose, renderAcceptAction, busy = false }) {
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Pro terms"
      description="Review and accept before continuing to payment."
      size="lg"
      dismissible={!busy}
      showCloseButton={!busy}
      footer={
        renderAcceptAction
          ? renderAcceptAction(onAccept)
          : (
              <Button className="w-full" onClick={onAccept}>
                I accept the terms &amp; proceed to payment
              </Button>
            )
      }
    >
      <div className="flex flex-col gap-4 text-xs leading-relaxed">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">1. Professional risk disclosure</p>
          <p className="text-muted-foreground">
            Trading XAU/USD (Gold) involves significant risk of loss. xaujournal is an analytics and journaling tool only. We do not provide financial advice, and you are solely responsible for your trading decisions and capital.
          </p>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="font-medium text-foreground">2. Data &amp; sync protocol</p>
          <p className="text-muted-foreground">
            Automated MT5 synchronization depends on your local hardware and internet stability. We do not guarantee 100% uptime of third-party broker connections or API data feeds.
          </p>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="font-medium text-foreground">3. Subscription &amp; payment policy</p>
          <p className="text-muted-foreground">
            Pro is billed in USD through PayPal and renews automatically on the monthly or yearly billing date you select. You can cancel future renewals before the next billing date; access continues through the period already paid for. Refund eligibility follows the xaujournal payment policy.
          </p>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="font-medium text-foreground">4. Agreement signature</p>
          <p className="text-muted-foreground">
            By clicking the confirmation button below, you are providing a digital signature acknowledging that you have read, understood, and agreed to these terms in full.
          </p>
        </div>

        <p className="border-t border-border pt-4 text-center font-mono text-[11px] text-muted-foreground">
          Terms version 1.0.6 · XAU v1.0
        </p>
      </div>
    </AppDialog>
  );
}
