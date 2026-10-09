<?php

use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\StaffUserController;
use App\Http\Controllers\Admin\SystemHealthController;
use App\Http\Controllers\Admin\VendorCategoryController;
use App\Http\Controllers\Admin\VendorManagementController;
use App\Http\Controllers\ComplianceController;
use App\Http\Controllers\DashboardRedirectController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PerformanceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\VendorOnboardingController;
use App\Http\Middleware\EnsureUserIsVendor;
use App\Http\Middleware\EnsureVendorAccountIsActive;
use App\Http\Middleware\EnsureVendorEmailIsVerified;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// Static pages
Route::get('/about', fn () => Inertia::render('About'))->name('about');
Route::get('/contact', fn () => Inertia::render('Contact'))->name('contact');
Route::post('/contact', [\App\Http\Controllers\ContactController::class, 'store'])
    ->middleware('throttle:contact-form')
    ->name('contact.store');
Route::get('/privacy', fn () => Inertia::render('Privacy'))->name('privacy');
Route::get('/terms', fn () => Inertia::render('Terms'))->name('terms');

Route::post('/locale', fn () => response()->noContent())->name('locale.update');

Route::middleware(['auth', EnsureVendorAccountIsActive::class, EnsureVendorEmailIsVerified::class])->group(function () {
    // Default Dashboard - redirects based on role
    Route::get('/dashboard', DashboardRedirectController::class)->name('dashboard');

    // ==========================================
    // NOTIFICATION ROUTES (All authenticated users)
    // ==========================================
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');

    // ==========================================
    // DOCUMENT ROUTES (All authenticated users)
    // ==========================================
    Route::get('/documents/{document}/view', [DocumentController::class, 'view'])
        ->middleware('throttle:document-access')
        ->name('documents.view');
    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])
        ->middleware('throttle:document-access')
        ->name('documents.download');

    // ==========================================
    // VENDOR ROUTES
    // ==========================================
    Route::middleware('role:vendor')->prefix('vendor')->name('vendor.')->group(function () {
        // Vendor Onboarding
        Route::prefix('onboarding')->name('onboarding')->middleware(EnsureUserIsVendor::class)->group(function () {
            Route::get('/', [VendorOnboardingController::class, 'show']);
            Route::post('/step1', [VendorOnboardingController::class, 'storeStep1'])->name('.step1');
            Route::post('/step2', [VendorOnboardingController::class, 'storeStep2'])->name('.step2');
            Route::post('/step3', [VendorOnboardingController::class, 'storeStep3'])->middleware(\App\Http\Middleware\ValidateOnboardingPostSize::class)->name('.step3');
            Route::post('/submit', [VendorOnboardingController::class, 'submit'])
                ->middleware('throttle:sensitive-action')
                ->name('.submit');
            Route::get('/document/{typeId}', [VendorOnboardingController::class, 'viewDocument'])->name('.document');
        });
        Route::get('/dashboard', [VendorController::class, 'index'])->name('dashboard');

        // Profile routes
        Route::get('/profile', [VendorController::class, 'profile'])->name('profile');
        Route::put('/profile', [VendorController::class, 'updateProfile'])
            ->middleware('throttle:sensitive-action')
            ->name('profile.update');

        // Documents routes
        Route::get('/documents', [VendorController::class, 'documents'])->name('documents');
        Route::post('/documents/upload', [VendorController::class, 'uploadDocument'])
            ->middleware('throttle:sensitive-action')
            ->name('documents.upload');

        // Compliance route
        Route::get('/compliance', [VendorController::class, 'compliance'])->name('compliance');

        // Performance route
        Route::get('/performance', [VendorController::class, 'performance'])->name('performance');

        // Payments routes
        Route::get('/payments', [VendorController::class, 'payments'])->name('payments');
        Route::post('/payments/request', [VendorController::class, 'createPaymentRequest'])
            ->middleware('throttle:sensitive-action')
            ->name('payments.request');

        // Notifications routes
        Route::get('/notifications', [VendorController::class, 'notifications'])->name('notifications');
        Route::patch('/notifications/{id}/read', [VendorController::class, 'markNotificationAsRead'])->name('notifications.read');
        Route::patch('/notifications/read-all', [VendorController::class, 'markAllNotificationsAsRead'])->name('notifications.read-all');
    });

    // ==========================================
    // STAFF ROUTES (Ops Manager / Finance Manager / Super Admin)
    // ==========================================
    Route::middleware(['staff.permission'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('staff.permission:dashboard.view')->name('dashboard');

        // Shared read-only vendor/payment/report access
        Route::get('/vendors', [VendorManagementController::class, 'index'])->middleware('staff.permission:vendors.view')->name('vendors.index');
        Route::get('/vendors/{vendor}', [VendorManagementController::class, 'show'])->middleware('staff.permission:vendors.view')->name('vendors.show');
        Route::get('/payments', [PaymentController::class, 'index'])->middleware('staff.permission:payments.view')->name('payments.index');
        Route::get('/payments/{payment}', [PaymentController::class, 'show'])->middleware('staff.permission:payments.view')->name('payments.show');

        Route::get('/reports', [ReportController::class, 'index'])->middleware('staff.permission:reports.view')->name('reports.index');
        Route::get('/reports/payment', [ReportController::class, 'paymentReport'])->middleware('staff.permission:reports.view')->name('reports.payment');
        Route::get('/reports/vendor-summary', [ReportController::class, 'vendorSummaryReport'])->middleware('staff.permission:reports.view')->name('reports.vendor-summary');
        Route::get('/reports/performance', [ReportController::class, 'performanceReport'])->middleware('staff.permission:reports.view')->name('reports.performance');
        Route::get('/reports/compliance', [ReportController::class, 'complianceReport'])->middleware('staff.permission:reports.view')->name('reports.compliance');
        Route::get('/reports/document-expiry', [ReportController::class, 'documentExpiryReport'])->middleware('staff.permission:reports.view')->name('reports.document-expiry');
        Route::get('/reports/export/{type}', [ReportController::class, 'exportCsv'])
            ->where('type', '[a-z_]+')
            ->middleware('staff.permission:reports.export')->name('reports.export');
        Route::get('/system-health', [SystemHealthController::class, 'index'])->middleware('staff.permission:system.health')->name('system-health.index');
    });

    // ==========================================
    // OPS + SUPER ADMIN ROUTES
    // ==========================================
    Route::middleware(['staff.permission'])->prefix('admin')->name('admin.')->group(function () {
        // Vendor lifecycle actions
        Route::post('/vendors/{vendor}/approve', [VendorManagementController::class, 'approve'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.approve')->name('vendors.approve');
        Route::post('/vendors/{vendor}/reject', [VendorManagementController::class, 'reject'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.reject')->name('vendors.reject');
        Route::post('/vendors/{vendor}/activate', [VendorManagementController::class, 'activate'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.activate')->name('vendors.activate');
        Route::post('/vendors/{vendor}/suspend', [VendorManagementController::class, 'suspend'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.suspend')->name('vendors.suspend');
        Route::post('/vendors/{vendor}/terminate', [VendorManagementController::class, 'terminate'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.terminate')->name('vendors.terminate');
        Route::post('/vendors/{vendor}/reactivate', [VendorManagementController::class, 'reactivate'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.terminate')->name('vendors.reactivate');
        Route::post('/vendors/{vendor}/notes', [VendorManagementController::class, 'notes'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:vendors.notes')->name('vendors.notes');

        // Admin notification sending
        Route::get('/notifications/send', [AdminNotificationController::class, 'index'])->middleware('staff.permission:notifications.send')->name('notifications.send');
        Route::post('/notifications/send', [AdminNotificationController::class, 'send'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:notifications.send')->name('notifications.store');

        // Contact messages
        Route::resource('contact-messages', \App\Http\Controllers\ContactController::class)->only(['index', 'show', 'update', 'destroy'])->middleware('staff.permission:messages.manage')->names('contact-messages');

        // Document management
        Route::get('/documents', [DocumentController::class, 'adminIndex'])->middleware('staff.permission:documents.list')->name('documents.index');
        Route::get('/documents/{document}/preview', [DocumentController::class, 'preview'])->middleware('staff.permission:documents.list')->name('documents.preview');
        Route::post('/documents/{document}/verify', [DocumentController::class, 'verify'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:documents.verify')->name('documents.verify');
        Route::post('/documents/{document}/reject', [DocumentController::class, 'reject'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:documents.reject')->name('documents.reject');

        // Compliance operations
        Route::get('/compliance', [ComplianceController::class, 'dashboard'])->middleware('staff.permission:compliance.access')->name('compliance.dashboard');
        Route::get('/compliance/rules', [ComplianceController::class, 'rules'])->middleware('staff.permission:compliance.access')->name('compliance.rules');
        Route::get('/compliance/vendor/{vendor}', [ComplianceController::class, 'vendorCompliance'])->middleware('staff.permission:compliance.access')->name('compliance.vendor');
        Route::post('/compliance/evaluate/{vendor}', [ComplianceController::class, 'evaluate'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:compliance.evaluate')->name('compliance.evaluate');
        Route::post('/compliance/evaluate-all', [ComplianceController::class, 'evaluateAll'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:compliance.evaluate')->name('compliance.evaluate-all');

        // Performance operations
        Route::get('/performance', [PerformanceController::class, 'index'])->middleware('staff.permission:performance.view')->name('performance.index');
        Route::get('/performance/{vendor}', [PerformanceController::class, 'show'])->middleware('staff.permission:performance.view')->name('performance.show');
        Route::get('/performance/{vendor}/rate', [PerformanceController::class, 'rateForm'])->middleware('staff.permission:performance.rate')->name('performance.rate-form');
        Route::post('/performance/{vendor}/rate', [PerformanceController::class, 'rate'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:performance.rate')->name('performance.rate');

        // Ops payment validation only
        Route::post('/payments/{payment}/validate-ops', [PaymentController::class, 'validateOps'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:payments.validate')->name('payments.validate-ops');
    });

    // ==========================================
    // FINANCE + SUPER ADMIN ROUTES
    // ==========================================
    Route::middleware(['staff.permission'])->prefix('admin')->name('admin.')->group(function () {
        Route::post('/payments/{payment}/approve-finance', [PaymentController::class, 'approveFinance'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:payments.approve')->name('payments.approve-finance');
        Route::post('/payments/{payment}/mark-paid', [PaymentController::class, 'markPaid'])
            ->middleware('throttle:sensitive-action')
            ->middleware('staff.permission:payments.disburse')->name('payments.mark-paid');
    });

    // ==========================================
    // SUPER ADMIN ONLY ROUTES
    // ==========================================
    Route::middleware(['role:super_admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/document-types', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'index'])->name('document-types.index');
        Route::post('/document-types', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'store'])->name('document-types.store');
        Route::put('/document-types/{documentType}', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'update'])->name('document-types.update');
        Route::delete('/document-types/{documentType}', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'destroy'])->name('document-types.destroy');

        Route::get('/performance-metrics', [\App\Http\Controllers\Admin\PerformanceMetricController::class, 'index'])->name('performance-metrics.index');
        Route::post('/performance-metrics', [\App\Http\Controllers\Admin\PerformanceMetricController::class, 'store'])->middleware('throttle:sensitive-action')->name('performance-metrics.store');
        Route::put('/performance-metrics/configuration', [\App\Http\Controllers\Admin\PerformanceMetricController::class, 'configuration'])->middleware('throttle:sensitive-action')->name('performance-metrics.configuration');
        Route::put('/performance-metrics/{performanceMetric}', [\App\Http\Controllers\Admin\PerformanceMetricController::class, 'update'])->middleware('throttle:sensitive-action')->name('performance-metrics.update');
        Route::delete('/performance-metrics/{performanceMetric}', [\App\Http\Controllers\Admin\PerformanceMetricController::class, 'destroy'])->middleware('throttle:sensitive-action')->name('performance-metrics.destroy');

        Route::get('/business-types', [\App\Http\Controllers\Admin\BusinessTypeController::class, 'index'])->name('business-types.index');
        Route::post('/business-types', [\App\Http\Controllers\Admin\BusinessTypeController::class, 'store'])->name('business-types.store');
        Route::put('/business-types/{businessType}', [\App\Http\Controllers\Admin\BusinessTypeController::class, 'update'])->name('business-types.update');
        Route::delete('/business-types/{businessType}', [\App\Http\Controllers\Admin\BusinessTypeController::class, 'destroy'])->name('business-types.destroy');

        Route::get('/vendor-categories', [VendorCategoryController::class, 'index'])->name('vendor-categories.index');
        Route::post('/vendor-categories', [VendorCategoryController::class, 'store'])->name('vendor-categories.store');
        Route::put('/vendor-categories/{vendorCategory}', [VendorCategoryController::class, 'update'])->name('vendor-categories.update');
        Route::delete('/vendor-categories/{vendorCategory}', [VendorCategoryController::class, 'destroy'])->name('vendor-categories.destroy');
        Route::get('/audit', [AuditLogController::class, 'index'])->name('audit.index');
        Route::patch('/compliance/rules/{rule}', [ComplianceController::class, 'updateRule'])
            ->middleware('throttle:sensitive-action')
            ->name('compliance.rules.update');
        Route::get('/staff-users', [StaffUserController::class, 'index'])->name('staff-users.index');
        Route::get('/staff-users/{staffUser}', [StaffUserController::class, 'show'])->name('staff-users.show');
        Route::put('/staff-users/{staffUser}', [StaffUserController::class, 'update'])->middleware('throttle:sensitive-action')->name('staff-users.update');
        Route::delete('/staff-users/{staffUser}', [StaffUserController::class, 'destroy'])->middleware('throttle:sensitive-action')->name('staff-users.destroy');
        Route::post('/staff-roles', [\App\Http\Controllers\Admin\StaffRoleController::class, 'store'])->middleware('throttle:sensitive-action')->name('staff-roles.store');
        Route::put('/staff-roles/{staffRole}', [\App\Http\Controllers\Admin\StaffRoleController::class, 'update'])->middleware('throttle:sensitive-action')->name('staff-roles.update');
        Route::delete('/staff-roles/{staffRole}', [\App\Http\Controllers\Admin\StaffRoleController::class, 'destroy'])->middleware('throttle:sensitive-action')->name('staff-roles.destroy');

        Route::post('/staff-users', [StaffUserController::class, 'store'])
            ->middleware('throttle:sensitive-action')
            ->name('staff-users.store');
    });

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/password', [ProfileController::class, 'updatePassword'])
        ->middleware('throttle:sensitive-action')
        ->name('profile.password');
    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->middleware('throttle:account-delete')
        ->name('profile.destroy');
});

require __DIR__.'/auth.php';

// Fallback route for undefined routes - redirects to appropriate dashboard
Route::fallback(fn () => auth()->check() ? app(DashboardRedirectController::class)() : redirect('/'));
