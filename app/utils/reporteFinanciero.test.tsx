
import { generarReporteFinancieroPDF } from './reporteFinanciero';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

jest.mock('jspdf', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        internal: {
            pageSize: {
                getWidth: jest.fn().mockReturnValue(210),
                getHeight: jest.fn().mockReturnValue(297)
            }
        },
        addImage: jest.fn(),
        addPage: jest.fn(),
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        setTextColor: jest.fn(),
        text: jest.fn(),
        save: jest.fn()
    }))
}));

jest.mock('jspdf-autotable', () => ({
    __esModule: true,
    default: jest.fn()
}));

const mockJsPDF = jsPDF as unknown as jest.Mock;
const mockAutoTable = autoTable as jest.Mock;

const mockFetch = jest.fn();

const totalesCaja = {
    balance: 5000,
    entradaCaja: 1000,
    totalIngresos: 8000,
    totalEgresos: 3000
};

const movements = [
    {
        fecha: '2026-11-10T10:30:00',
        concepto: 'Venta de impresiones',
        tipoMovimiento: 'INGRESO',
        monto: 1500
    },
    {
        fecha: '2026-11-11T12:00:00',
        concepto: 'Compra de material',
        tipoMovimiento: 'EGRESO',
        monto: 500
    }
];

const mockFileReader = () => {
    (globalThis as any).FileReader = jest.fn().mockImplementation(() => ({
        result: 'data:image/jpeg;base64,imagen-membrete',
        readAsDataURL: jest.fn(function (this: any) {
            this.onloadend?.();
        })
    }));
};

describe('generarReporteFinancieroPDF', () => {
    beforeEach(() => {
        mockJsPDF.mockClear();
        mockAutoTable.mockReset();

        mockFetch.mockReset();
        (globalThis as any).fetch = mockFetch;

        mockFetch.mockResolvedValue({
            ok: true,
            blob: jest.fn().mockResolvedValue(new Blob(['imagen']))
        });

        mockFileReader();
    });

    it('debe generar el reporte financiero correctamente', async () => {
        await expect(
            generarReporteFinancieroPDF(
                totalesCaja,
                movements,
                'Noviembre 2026'
            )
        ).resolves.toBeUndefined();

        expect(mockJsPDF).toHaveBeenCalledTimes(1);

        expect(mockFetch).toHaveBeenCalledWith('/membrete.jpeg');

        expect(mockAutoTable).toHaveBeenCalledTimes(1);
    });

    it('debe agregar el membrete como fondo del documento', async () => {
        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const doc = mockJsPDF.mock.results[0].value;

        expect(doc.addImage).toHaveBeenCalledWith(
            'data:image/jpeg;base64,imagen-membrete',
            'JPEG',
            0,
            0,
            210,
            297
        );
    });

    it('debe incluir los datos del reporte y el resumen de caja', async () => {
        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const doc = mockJsPDF.mock.results[0].value;

        const textos = doc.text.mock.calls.map(
            (call: any[]) => call[0]
        );

        expect(textos).toContain('Reporte');
        expect(textos).toContain('Período del reporte: Noviembre 2026');
        expect(textos).toContain('Resumen de caja');
        expect(textos).toContain('Detalle de movimientos');

        expect(textos).toContainEqual(
            expect.stringContaining('Balance actual:')
        );

        expect(textos).toContainEqual(
            expect.stringContaining('Fondo base / Entradas:')
        );

        expect(textos).toContainEqual(
            expect.stringContaining('Total ingresos:')
        );

        expect(textos).toContainEqual(
            expect.stringContaining('Total egresos:')
        );
    });

    it('debe generar correctamente las filas de la tabla de movimientos', async () => {
        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const options = mockAutoTable.mock.calls[0][1];

        expect(options.head).toEqual([
            ['Fecha', 'Concepto', 'Tipo', 'Monto']
        ]);

        expect(options.body).toHaveLength(2);

        expect(options.body[0][1]).toBe('Venta de impresiones');
        expect(options.body[0][2]).toBe('INGRESO');
        expect(options.body[0][3]).toContain('+');

        expect(options.body[1][1]).toBe('Compra de material');
        expect(options.body[1][2]).toBe('EGRESO');
        expect(options.body[1][3]).toContain('-');
    });

    it('debe configurar correctamente los estilos y opciones de la tabla', async () => {
        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const options = mockAutoTable.mock.calls[0][1];

        expect(options.startY).toBeGreaterThan(0);
        expect(options.theme).toBe('grid');
        expect(options.showHead).toBe('everyPage');
        expect(options.rowPageBreak).toBe('avoid');

        expect(options.headStyles).toEqual({
            fillColor: [18, 59, 112],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        });

        expect(options.bodyStyles).toEqual({
            fontSize: 9,
            textColor: [40, 40, 40],
            cellPadding: 2.5
        });

        expect(options.margin).toEqual({
            top: 78,
            bottom: 45,
            left: 14,
            right: 14
        });
    });

    it('debe aplicar colores alternados a las filas de la tabla', async () => {
        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const options = mockAutoTable.mock.calls[0][1];

        const primeraCelda = {
            section: 'body',
            row: { index: 0 },
            cell: { styles: {} as any }
        };

        const segundaCelda = {
            section: 'body',
            row: { index: 1 },
            cell: { styles: {} as any }
        };

        options.didParseCell(primeraCelda);
        options.didParseCell(segundaCelda);

        expect(primeraCelda.cell.styles.fillColor).toEqual([
            255, 255, 255
        ]);

        expect(segundaCelda.cell.styles.fillColor).toEqual([
            235, 243, 250
        ]);
    });

    it('debe agregar el membrete nuevamente al crear una página adicional', async () => {
        mockAutoTable.mockImplementation((doc: any) => {
            doc.addPage();
        });

        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const doc = mockJsPDF.mock.results[0].value;

        expect(doc.addImage).toHaveBeenCalledTimes(2);
    });

    it('debe guardar el archivo PDF con el nombre correspondiente al filtro', async () => {
        await generarReporteFinancieroPDF(
            totalesCaja,
            movements,
            'Noviembre 2026'
        );

        const doc = mockJsPDF.mock.results[0].value;

        expect(doc.save).toHaveBeenCalledTimes(1);
        expect(doc.save).toHaveBeenCalledWith(
            expect.stringMatching(
                /^Reporte_Financiero_Noviembre 2026_\d{2}-\d{2}-\d{4}\.pdf$/
            )
        );
    });

    it('debe generar el reporte cuando no existen movimientos', async () => {
        await expect(
            generarReporteFinancieroPDF(
                totalesCaja,
                [],
                'Sin movimientos'
            )
        ).resolves.toBeUndefined();

        const options = mockAutoTable.mock.calls[0][1];

        expect(options.body).toEqual([]);
    });

    it('debe generar el reporte cuando existen movimientos sin fecha', async () => {
        const movimientosSinFecha = [
            {
                fecha: '',
                concepto: 'Ajuste de caja',
                tipoMovimiento: 'INGRESO',
                monto: 200
            }
        ];

        await generarReporteFinancieroPDF(
            totalesCaja,
            movimientosSinFecha,
            'Noviembre 2026'
        );

        const options = mockAutoTable.mock.calls[0][1];

        expect(options.body[0][0]).toBe('');
        expect(options.body[0][1]).toBe('Ajuste de caja');
    });

    it('debe lanzar un error cuando no se encuentra la imagen del membrete', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            blob: jest.fn()
        });

        await expect(
            generarReporteFinancieroPDF(
                totalesCaja,
                movements,
                'Noviembre 2026'
            )
        ).rejects.toThrow(
            'No se pudo encontrar la imagen del membrete en la carpeta public'
        );

        expect(mockAutoTable).not.toHaveBeenCalled();
    });

    it('debe propagar el error cuando falla la carga de la imagen', async () => {
        const error = new Error('Error de conexión');

        mockFetch.mockRejectedValueOnce(error);

        await expect(
            generarReporteFinancieroPDF(
                totalesCaja,
                movements,
                'Noviembre 2026'
            )
        ).rejects.toThrow('Error de conexión');

        expect(mockAutoTable).not.toHaveBeenCalled();
    });
});
