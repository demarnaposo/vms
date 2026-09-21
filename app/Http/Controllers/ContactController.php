<?php

namespace App\Http\Controllers;

use App\Http\Requests\Admin\UpdateContactMessageRequest;
use App\Http\Requests\StoreContactMessageRequest;
use App\Models\AuditLog;
use App\Models\ContactMessage;
use App\Services\ContactMessageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ContactController extends Controller
{
    public function __construct(protected ContactMessageService $contactMessageService) {}

    /**
     * Store a new contact message
     */
    public function store(StoreContactMessageRequest $request)
    {
        try {
            $this->contactMessageService->create($request->validated());
        } catch (\Throwable $exception) {
            Log::error('Contact message submission failed', [
                'exception' => $exception::class,
            ]);

            return back()->with('error', __('alerts.contact_message_failed'));
        }

        return back()->with('success', __('alerts.contact_message_sent'));
    }

    /**
     * Display all contact messages (Admin only)
     */
    public function index(Request $request)
    {
        $data = $this->contactMessageService->indexData($request);

        return Inertia::render('Admin/ContactMessages/Index', [
            'messages' => $data['messages'],
            'filters' => $data['filters'],
            'stats' => $data['stats'],
        ]);
    }

    /**
     * Show a single message
     */
    public function show(ContactMessage $contactMessage)
    {
        $message = $this->contactMessageService->markAsReadIfNew($contactMessage);

        return Inertia::render('Admin/ContactMessages/Show', [
            'message' => $message,
        ]);
    }

    /**
     * Update message status
     */
    public function update(UpdateContactMessageRequest $request, ContactMessage $contactMessage)
    {
        $this->contactMessageService->update($contactMessage, $request->validated());

        return back()->with('success', 'Message updated successfully.');
    }

    /**
     * Delete a message
     */
    public function destroy(ContactMessage $contactMessage)
    {
        AuditLog::log(
            AuditLog::EVENT_DELETED,
            $contactMessage,
            [
                'status' => $contactMessage->status,
                'email' => $contactMessage->email,
            ],
            null,
            'Contact message soft-deleted by staff'
        );

        $contactMessage->delete();

        return redirect()->route('admin.contact-messages.index')
            ->with('success', 'Message deleted successfully.');
    }
}
