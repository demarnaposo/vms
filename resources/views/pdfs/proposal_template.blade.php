<!DOCTYPE html>
<html>
<head>
    <title>Vendor Proposal</title>
    <style>
        body { font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        .content { margin: 0 20px; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
        .label { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $platform_name }} - Vendor Agreement Proposal</h1>
        <p>Date Generated: {{ $date }}</p>
    </div>

    <div class="content">
        <p>Dear <span class="label">{{ $vendor_name }}</span>,</p>
        <p>Thank you for applying to join the {{ $platform_name }} vendor network. Based on your application review, we are pleased to offer you the following terms:</p>
        
        <ul>
            <li><span class="label">Platform Commission Rate:</span> {{ $commission_rate }}% per successful transaction.</li>
            {{-- Start Update 11 September 2026, by @WNP: Render the proposal bond amount using the centralized IDR formatter output. --}}
            <li><span class="label">Security Bond Requirement:</span> {{ $bond_amount }}</li>
            <li><span class="label">Status Requirements:</span> You must maintain compliance metrics above 80% to remain active.</li>
        </ul>

        <h3>Next Steps</h3>
        <p>To proceed with your onboarding and activate your vendor account, please digitally sign this agreement via your vendor dashboard, and proceed to submit your security bond deposit.</p>

        <br><br>
        <p>Sincerely,</p>
        <p><strong>The {{ $platform_name }} Team</strong></p>
    </div>

    <div class="footer">
        <p>This is an automated system-generated proposal document.</p>
        <p>System Hash: {{ hash('sha256', $vendor_name . $date) }}</p>
    </div>
</body>
</html>
