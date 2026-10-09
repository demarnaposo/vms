<!DOCTYPE html>
<html data-theme="ocean" lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title inertia>VMS</title>

    <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
    <link rel="dns-prefetch" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=manrope:400,500,600,700,800&display=swap" rel="stylesheet" />

    <script>
        (function() {
            var theme = 'ocean';
            try {
                var stored = localStorage.getItem('vms-theme');
                if (['ocean', 'midnight'].indexOf(stored) !== -1) {
                    theme = stored;
                }
                if (stored !== null && stored !== theme) {
                    localStorage.setItem('vms-theme', theme);
                }
            } catch (e) {}
            document.documentElement.dataset.theme = theme;
            document.documentElement.classList.toggle('dark', theme === 'midnight');
        })();
    </script>

    <style>
        html {
            background: var(--color-bg-primary, #f6fbff);
        }

        .page-loader {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--gradient-page, #f6fbff);
            z-index: 9999;
            transition: opacity 0.45s ease-out, visibility 0.45s ease-out;
        }

        .page-loader.fade-out {
            opacity: 0;
            visibility: hidden;
        }

        .page-loader::after {
            content: '';
            width: 38px;
            height: 38px;
            border: 2px solid var(--color-brand-primary-light, #dbeafe);
            border-top-color: var(--color-brand-primary, #0b4a6f);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    </style>

    @routes
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>

<body class="font-sans antialiased">
    <div id="page-loader" class="page-loader"></div>
    @inertia
</body>

</html>
