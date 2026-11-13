
import { comprasService } from './shopService';
import { apiClient } from './apiClient';

jest.mock('./apiClient', () => ({
    apiClient: jest.fn()
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

const mockResponse = (data?: any, ok = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(data)
} as unknown as Response);

describe('comprasService', () => {
    beforeEach(() => {
        mockApiClient.mockReset();
    });

    describe('getPendientes', () => {
        it('debe obtener las solicitudes de compra pendientes', async () => {
            const solicitudes = [
                {
                    idSolicitud: 1,
                    idOrden: 10,
                    idUsuarioSolicitante: 5,
                    idEstatus: 1,
                    fechaCreacion: '2026-11-13',
                    descripcionSolicitud: 'Compra de material',
                    detalles: [
                        {
                            idDetalle: 1,
                            idProducto: 20,
                            cantidad: 5
                        }
                    ]
                }
            ];

            mockApiClient.mockResolvedValueOnce(mockResponse(solicitudes));

            await expect(comprasService.getPendientes()).resolves.toEqual(solicitudes);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/compras/pendientes'),
                { method: 'GET' }
            );
        });

        it('debe lanzar un error cuando falla la consulta de compras pendientes', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(comprasService.getPendientes()).rejects.toThrow(
                'Error al obtener compras pendientes'
            );
        });
    });

    describe('registrarCompraExitosa', () => {
        const comprobante = new File(['contenido'], 'comprobante.pdf', {
            type: 'application/pdf'
        });

        it('debe registrar una compra exitosa con el usuario proporcionado', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse());

            await expect(
                comprasService.registrarCompraExitosa(1, 1500, comprobante, 25)
            ).resolves.toBeUndefined();

            expect(mockApiClient).toHaveBeenCalledTimes(1);

            const [url, options] = mockApiClient.mock.calls[0];

            expect(url).toContain('/compras/1/compra-exitosa');
            expect(options?.method).toBe('POST');
            expect(options?.headers).toEqual({
                'X-User-Id': '25'
            });

            const formData = options?.body as FormData;

            expect(formData.get('costoReal')).toBe('1500');
            expect(formData.get('comprobante')).toBe(comprobante);
        });

        it('debe utilizar el usuario 11 cuando no se proporciona userId', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse());

            await comprasService.registrarCompraExitosa(2, 800, comprobante);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/compras/2/compra-exitosa'),
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'X-User-Id': '11'
                    }
                })
            );
        });

        it('debe lanzar un error cuando falla el registro de la compra exitosa', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(
                comprasService.registrarCompraExitosa(1, 1500, comprobante)
            ).rejects.toThrow('Error al registrar la compra exitosa');
        });
    });

    describe('registrarCompraAtrasada', () => {
        const comprobante = new File(['contenido'], 'comprobante.pdf', {
            type: 'application/pdf'
        });

        it('debe registrar una compra atrasada con todos sus datos', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse());

            await expect(
                comprasService.registrarCompraAtrasada(
                    3,
                    2500,
                    '2026-11-20',
                    comprobante,
                    30
                )
            ).resolves.toBeUndefined();

            expect(mockApiClient).toHaveBeenCalledTimes(1);

            const [url, options] = mockApiClient.mock.calls[0];

            expect(url).toContain('/compras/3/compra-atrasada');
            expect(options?.method).toBe('POST');
            expect(options?.headers).toEqual({
                'X-User-Id': '30'
            });

            const formData = options?.body as FormData;

            expect(formData.get('costoReal')).toBe('2500');
            expect(formData.get('nuevaFechaEntrega')).toBe('2026-11-20');
            expect(formData.get('comprobante')).toBe(comprobante);
        });

        it('debe utilizar el usuario 11 cuando no se proporciona userId', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse());

            await comprasService.registrarCompraAtrasada(
                4,
                1200,
                '2026-11-25',
                comprobante
            );

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/compras/4/compra-atrasada'),
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'X-User-Id': '11'
                    }
                })
            );
        });

        it('debe lanzar un error cuando falla el registro de la compra atrasada', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(
                comprasService.registrarCompraAtrasada(
                    3,
                    2500,
                    '2026-11-20',
                    comprobante
                )
            ).rejects.toThrow('Error al registrar la compra atrasada');
        });
    });

    describe('registrarLlegadaAtrasada', () => {
        it('debe registrar la llegada de los insumos atrasados', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse());

            await expect(
                comprasService.registrarLlegadaAtrasada(5, 40)
            ).resolves.toBeUndefined();

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/compras/5/llegada-atrasada'),
                {
                    method: 'PUT',
                    headers: {
                        'X-User-Id': '40'
                    }
                }
            );
        });

        it('debe utilizar el usuario 11 cuando no se proporciona userId', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse());

            await comprasService.registrarLlegadaAtrasada(6);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/compras/6/llegada-atrasada'),
                {
                    method: 'PUT',
                    headers: {
                        'X-User-Id': '11'
                    }
                }
            );
        });

        it('debe lanzar un error cuando falla el registro de la llegada atrasada', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(
                comprasService.registrarLlegadaAtrasada(5)
            ).rejects.toThrow(
                'Error al registrar la llegada de los insumos atrasados'
            );
        });
    });
});
