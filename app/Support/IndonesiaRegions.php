<?php

namespace App\Support;

use RuntimeException;

class IndonesiaRegions
{
    /** @var array<string, mixed>|null */
    private static ?array $data = null;

    // Start Update 11 September 2026, by @WNP: Expose the Indonesian country default from the shared region snapshot.
    public static function country(): string
    {
        return self::data()['country'];
    }

    /** @return array<int, string> */
    // Start Update 11 September 2026, by @WNP: Provide the valid province list for server-side validation.
    public static function provinces(): array
    {
        return array_keys(self::data()['provinces']);
    }

    /** @return array<int, string> */
    // Start Update 11 September 2026, by @WNP: Provide valid regencies and cities for a selected province.
    public static function citiesFor(string $province): array
    {
        return self::data()['provinces'][$province] ?? [];
    }

    /** @return array{country: string, provinces: array<string, array<int, string>>} */
    // Start Update 11 September 2026, by @WNP: Load and cache the shared static region dataset safely.
    private static function data(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        $path = resource_path('data/indonesiaRegions.json');
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('Unable to load Indonesian region data.');
        }

        /** @var array{country: string, provinces: array<string, array<int, string>>} $data */
        $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        self::$data = $data;

        return self::$data;
    }
}
