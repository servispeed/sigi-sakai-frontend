
import { SobranteService } from './leftoverService';
import { apiClient } from './apiClient';

jest.mock('./apiClient', () => ({
    apiClient: jest.fn()
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

const mockResponse = (data?: any, ok = true, errorText = '') => ({
    ok,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(errorText)
} as unknown as Response);

describe('SobranteService', () => {
    beforeEach(() => {
        mockApiClient.mockReset();
    });

    describe('getAllSobrantes', () => {
        it('debe obtener todos los sobrantes con los parámetros de paginación proporcionados', async () => {
            const sobrantes = [
                {
                    idSobrante: 1,
                    idCliente: 10,
                    idProducto: 20,
                    idOrden: 30,
                    cantidadDisponible: 5
                }
            ];

            mockApiClient.mockResolvedValueOnce(mockResponse(sobrantes));

            await expect(
                SobranteService.getAllSobrantes(2, 20)
            ).resolves.toEqual(sobrantes);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/sobrantes?page=2&size=20'),
                { method: 'GET' }
            );
        });

        it('debe utilizar la paginación predeterminada cuando no se proporcionan parámetros', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse([]));

            await expect(
                SobranteService.getAllSobrantes()
            ).resolves.toEqual([]);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/sobrantes?page=0&size=10'),
                { method: 'GET' }
            );
        });

        it('debe lanzar un error cuando falla la consulta de sobrantes', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(
                SobranteService.getAllSobrantes()
            ).rejects.toThrow('Error al obtener todos los sobrantes');
        });
    });

    describe('getSobrantesPorCliente', () => {
        it('debe obtener los sobrantes de un cliente con la paginación proporcionada', async () => {
            const sobrantes = [
                {
                    idSobrante: 2,
                    idCliente: 15,
                    idProducto: 25,
                    idOrden: 35,
                    cantidadDisponible: 8
                }
            ];

            mockApiClient.mockResolvedValueOnce(mockResponse(sobrantes));

            await expect(
                SobranteService.getSobrantesPorCliente(15, 1, 25)
            ).resolves.toEqual(sobrantes);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/sobrantes/cliente/15?page=1&size=25'),
                { method: 'GET' }
            );
        });

        it('debe utilizar la paginación predeterminada cuando no se proporcionan parámetros', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse([]));

            await expect(
                SobranteService.getSobrantesPorCliente(15)
            ).resolves.toEqual([]);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/sobrantes/cliente/15?page=0&size=10'),
                { method: 'GET' }
            );
        });

        it('debe lanzar un error cuando falla la consulta de sobrantes del cliente', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(
                SobranteService.getSobrantesPorCliente(15)
            ).rejects.toThrow('Error al obtener los sobrantes del cliente');
        });
    });

    describe('registrarSobrante', () => {
        const sobrante = {
            idCliente: 10,
            idProducto: 20,
            idOrden: 30,
            cantidad: 5
        };

        it('debe registrar un sobrante correctamente', async () => {
            const respuesta = {
                idSobrante: 1,
                ...sobrante
            };

            mockApiClient.mockResolvedValueOnce(mockResponse(respuesta));

            await expect(
                SobranteService.registrarSobrante(sobrante)
            ).resolves.toEqual(respuesta);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/sobrantes'),
                {
                    method: 'POST',
                    body: JSON.stringify(sobrante)
                }
            );
        });

        it('debe lanzar un error cuando falla el registro del sobrante', async () => {
            mockApiClient.mockResolvedValueOnce(mockResponse(undefined, false));

            await expect(
                SobranteService.registrarSobrante(sobrante)
            ).rejects.toThrow('Error al registrar el sobrante');
        });
    });

    describe('consumirSobrante', () => {
        it('debe consumir una cantidad del sobrante correctamente', async () => {
            const respuesta = {
                idSobrante: 5,
                cantidadDisponible: 3
            };

            mockApiClient.mockResolvedValueOnce(mockResponse(respuesta));

            await expect(
                SobranteService.consumirSobrante(5, 2)
            ).resolves.toEqual(respuesta);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/sobrantes/5/consumir'),
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        cantidadConsumida: 2
                    })
                }
            );
        });

        it('debe lanzar el mensaje de error devuelto por el servidor', async () => {
            mockApiClient.mockResolvedValueOnce(
                mockResponse(undefined, false, 'La cantidad supera el sobrante disponible')
            );

            await expect(
                SobranteService.consumirSobrante(5, 10)
            ).rejects.toThrow('La cantidad supera el sobrante disponible');
        });

        it('debe lanzar el mensaje predeterminado cuando el servidor no devuelve un error', async () => {
            mockApiClient.mockResolvedValueOnce(
                mockResponse(undefined, false, '')
            );

            await expect(
                SobranteService.consumirSobrante(5, 10)
            ).rejects.toThrow('Error al consumir el sobrante');
        });
    });
});
