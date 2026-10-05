<?php

return [
    // [VMS_PAYMENTS_DISABLED] Payments are handled externally; set VMS_PAYMENTS_ENABLED=true to restore this module.
    'payments' => ['enabled' => env('VMS_PAYMENTS_ENABLED', false)],
];
