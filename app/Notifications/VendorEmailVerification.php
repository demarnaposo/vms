<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class VendorEmailVerification extends VerifyEmail
{
    protected function buildMailMessage($url): MailMessage
    {
        return (new MailMessage)
            ->subject(__('verification.mail.subject'))
            ->line(__('verification.mail.intro'))
            ->action(__('verification.mail.action'), $url)
            ->line(__('verification.mail.ignore'));
    }
}
