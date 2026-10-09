import test from 'node:test';
import assert from 'node:assert/strict';
import { percentageUnits } from '../../resources/js/utils/performanceWeights.js';
import {
    SYSTEM_MASTER_DATA,
    translateSystemMasterDataField,
} from '../../resources/js/i18n/systemMasterData.js';

test('percentage information uses deterministic hundredths without rounding unsupported inputs', () => {
    assert.equal(
        percentageUnits('33.33') + percentageUnits('33.33') + percentageUnits('33.34'),
        10000
    );
    assert.equal(
        [25, 25, 25, 10, 5, 10].reduce((sum, value) => sum + percentageUnits(value), 0),
        10000
    );
    assert.equal(percentageUnits('0.01'), 1);
    for (const invalid of ['1.234', '-1', 'NaN', '1e2', '', null])
        assert.equal(percentageUnits(invalid), 0);
});

test('the six requested Indonesian labels and descriptions retain their exact wording', () => {
    const expected = [
        [
            'work_quality',
            'Kualitas Pekerjaan',
            'Kualitas barang/jasa yang diberikan sesuai spesifikasi',
        ],
        ['work_quantity', 'Kuantitas Pekerjaan', 'Ketepatan jumlah barang/jasa sesuai pesanan'],
        [
            'goods_services_price',
            'Harga Barang/Jasa',
            'Penilaian terhadap seberapa kompetitif penawaran harga yang diberikan oleh vendor',
        ],
        [
            'goods_services_provision',
            'Penyediaan Barang/Jasa',
            'Ketepatan waktu pengiriman barang/jasa termasuk penyediaan barang/jasa pengganti atau penanganan komplain',
        ],
        ['payment_mechanism', 'Mekanisme', 'Fleksibilitas pembayaran (bisa pembayaran tempo)'],
        [
            'invoice_delivery',
            'Pengiriman Invoice',
            'Ketepatan waktu pengiriman tagihan dengan lengkap dan benar',
        ],
    ];
    for (const [name, label, description] of expected) {
        const record = { name, ...SYSTEM_MASTER_DATA.performance_metrics[name] };
        assert.equal(translateSystemMasterDataField('id', 'performance_metrics', record), label);
        assert.equal(
            translateSystemMasterDataField('id', 'performance_metrics', record, 'description'),
            description
        );
        assert.equal(
            translateSystemMasterDataField('en', 'performance_metrics', record),
            record.display_name
        );
    }
});
