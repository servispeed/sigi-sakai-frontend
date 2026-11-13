
import { ClientService } from './clientService';
import { apiClient } from './apiClient';
import {
    ClientRequest,
    TipoClienteFiltro
} from '@/app/types/clients';

jest.mock('./apiClient');

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe('ClientService', () => {
    beforeEach(() => {
        mockApiClient.mockReset();
    });

    describe('getAll', () => {
        it('debe obtener y normalizar todos los clientes', async () => {
            const rawData = [
                {
                    idCliente: 101,
                    nombre: 'Empresa A',
                    email: 'contacto@a.com',
                    rfc: 'XAXX010101000',
                    totalCompras: 5
                },
                {
                    id: 102,
                    nombre: 'Cliente B'
                }
            ];

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(rawData)
            } as unknown as Response);

            const result = await ClientService.getAll();

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes')
            );

            expect(result).toEqual([
                {
                    idCliente: 101,
                    id: 101,
                    nombre: 'Empresa A',
                    email: 'contacto@a.com',
                    rfc: 'XAXX010101000',
                    totalCompras: 5
                },
                {
                    id: 102,
                    nombre: 'Cliente B',
                    email: '',
                    rfc: '',
                    totalCompras: 0
                }
            ]);
        });

        it('debe utilizar comprasCount cuando totalCompras no está disponible', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce([
                    {
                        idCliente: 10,
                        comprasCount: 8
                    }
                ])
            } as unknown as Response);

            const result = await ClientService.getAll();

            expect(result[0].totalCompras).toBe(8);
        });

        it('debe incluir la query string cuando se proporciona un tipo diferente de todos', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce([])
            } as unknown as Response);

            await ClientService.getAll('frecuente' as TipoClienteFiltro);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/filtrar?tipo=frecuente')
            );
        });

        it('no debe incluir query string cuando el tipo es todos', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce([])
            } as unknown as Response);

            await ClientService.getAll('todos');

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.not.stringContaining('?tipo=')
            );
        });

        it('debe manejar estructuras paginadas con propiedad content', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({
                    content: [
                        {
                            idCliente: 5,
                            nombre: 'Cliente Paginado'
                        }
                    ]
                })
            } as unknown as Response);

            const result = await ClientService.getAll();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(5);
            expect(result[0].totalCompras).toBe(0);
        });

        it('debe devolver una lista vacía si la respuesta no contiene clientes', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({})
            } as unknown as Response);

            const result = await ClientService.getAll();

            expect(result).toEqual([]);
        });

        it('debe lanzar un error si la petición no es exitosa', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: false
            } as unknown as Response);

            await expect(ClientService.getAll()).rejects.toThrow(
                'Error al obtener clientes'
            );
        });
    });

    describe('getById', () => {
        it('debe obtener un cliente por su identificador', async () => {
            const mockClient = {
                id: 1,
                nombre: 'Juan Pérez'
            };

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockClient)
            } as unknown as Response);

            const result = await ClientService.getById(1);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/1')
            );

            expect(result).toEqual(mockClient);
        });

        it('debe lanzar un error cuando no se encuentra el cliente', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: false
            } as unknown as Response);

            await expect(ClientService.getById(999)).rejects.toThrow(
                'No se pudo obtener el cliente'
            );
        });
    });

    describe('getLastPurchase', () => {
        it('debe obtener la última compra del cliente', async () => {
            const mockUltimaCompra = {
                idOrden: 50,
                fecha: '2026-10-01',
                total: 1500
            };

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockUltimaCompra)
            } as unknown as Response);

            const result = await ClientService.getLastPurchase(1);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/1/ultima-compra')
            );

            expect(result).toEqual(mockUltimaCompra);
        });

        it('debe lanzar un error cuando no se puede obtener la última compra', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: false
            } as unknown as Response);

            await expect(
                ClientService.getLastPurchase(1)
            ).rejects.toThrow(
                'No se pudo obtener la última compra del cliente'
            );
        });
    });

    describe('getPurchasesCount', () => {
        it('debe devolver dos compras para identificadores pares', async () => {
            jest.useFakeTimers();

            const promise = ClientService.getPurchasesCount(2);

            jest.advanceTimersByTime(300);

            await expect(promise).resolves.toBe(2);

            jest.useRealTimers();
        });

        it('debe devolver cuatro compras para identificadores impares', async () => {
            jest.useFakeTimers();

            const promise = ClientService.getPurchasesCount(3);

            jest.advanceTimersByTime(300);

            await expect(promise).resolves.toBe(4);

            jest.useRealTimers();
        });
    });

    describe('uploadDocuments', () => {
        it('debe subir los tres documentos del cliente', async () => {
            const files = {
                csf: new File(['csf'], 'csf.pdf', {
                    type: 'application/pdf'
                }),
                comprobanteDomicilio: new File(
                    ['comprobante'],
                    'domicilio.pdf',
                    { type: 'application/pdf' }
                ),
                ine: new File(['ine'], 'ine.pdf', {
                    type: 'application/pdf'
                })
            };

            mockApiClient.mockResolvedValue({
                ok: true
            } as unknown as Response);

            await ClientService.uploadDocuments(10, files);

            expect(mockApiClient).toHaveBeenCalledTimes(3);

            const llamadas = mockApiClient.mock.calls;

            expect(llamadas[0][0]).toContain('/clientes/10/documentos');
            expect(llamadas[1][0]).toContain('/clientes/10/documentos');
            expect(llamadas[2][0]).toContain('/clientes/10/documentos');

            expect(llamadas[0][1]?.method).toBe('POST');
            expect(llamadas[1][1]?.method).toBe('POST');
            expect(llamadas[2][1]?.method).toBe('POST');

            const formDataCSF = llamadas[0][1]?.body as FormData;
            const formDataDomicilio = llamadas[1][1]?.body as FormData;
            const formDataINE = llamadas[2][1]?.body as FormData;

            expect(formDataCSF.get('file')).toBe(files.csf);
            expect(formDataCSF.get('tipoDocumento')).toBe('CSF');

            expect(formDataDomicilio.get('file')).toBe(
                files.comprobanteDomicilio
            );
            expect(formDataDomicilio.get('tipoDocumento')).toBe(
                'COMPROBANTE_DOMICILIO'
            );

            expect(formDataINE.get('file')).toBe(files.ine);
            expect(formDataINE.get('tipoDocumento')).toBe('INE');
        });

        it('debe detener la subida y lanzar un error cuando falla un documento', async () => {
            const files = {
                csf: new File(['csf'], 'csf.pdf'),
                comprobanteDomicilio: new File(
                    ['comprobante'],
                    'domicilio.pdf'
                ),
                ine: new File(['ine'], 'ine.pdf')
            };

            mockApiClient
                .mockResolvedValueOnce({
                    ok: true
                } as unknown as Response)
                .mockResolvedValueOnce({
                    ok: false
                } as unknown as Response);

            await expect(
                ClientService.uploadDocuments(10, files)
            ).rejects.toThrow(
                'Error al subir el documento COMPROBANTE_DOMICILIO'
            );

            expect(mockApiClient).toHaveBeenCalledTimes(2);
        });
    });

    describe('getDocuments', () => {
        it('debe obtener los documentos del cliente', async () => {
            const documentos = [
                { idDocumento: 1, tipoDocumento: 'CSF' },
                { idDocumento: 2, tipoDocumento: 'INE' }
            ];

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(documentos)
            } as unknown as Response);

            const result = await ClientService.getDocuments(10);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/10/documentos')
            );

            expect(result).toEqual(documentos);
        });

        it('debe obtener los documentos desde la propiedad documentos', async () => {
            const documentos = [
                { idDocumento: 1, tipoDocumento: 'CSF' }
            ];

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ documentos })
            } as unknown as Response);

            const result = await ClientService.getDocuments(10);

            expect(result).toEqual(documentos);
        });

        it('debe devolver una lista vacía cuando la respuesta no es exitosa', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: false
            } as unknown as Response);

            await expect(
                ClientService.getDocuments(10)
            ).resolves.toEqual([]);
        });

        it('debe devolver una lista vacía cuando ocurre un error', async () => {
            mockApiClient.mockRejectedValueOnce(
                new Error('Error de conexión')
            );

            await expect(
                ClientService.getDocuments(10)
            ).resolves.toEqual([]);
        });
    });

    describe('downloadDocument', () => {
        it('debe descargar un documento y obtener su nombre', async () => {
            const blob = new Blob(['contenido'], {
                type: 'application/pdf'
            });

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(
                        'attachment; filename="recibo.pdf"'
                    )
                },
                blob: jest.fn().mockResolvedValueOnce(blob)
            } as unknown as Response);

            const result = await ClientService.downloadDocument(10, 25);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining(
                    '/clientes/10/documentos/25/descargar'
                )
            );

            expect(result).toEqual({
                blob,
                filename: 'recibo.pdf'
            });
        });

        it('debe utilizar un nombre predeterminado si no existe content-disposition', async () => {
            const blob = new Blob(['contenido']);

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                blob: jest.fn().mockResolvedValueOnce(blob)
            } as unknown as Response);

            const result = await ClientService.downloadDocument(10, 25);

            expect(result).toEqual({
                blob,
                filename: 'documento_25'
            });
        });

        it('debe lanzar un error cuando falla la descarga', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: false
            } as unknown as Response);

            await expect(
                ClientService.downloadDocument(10, 25)
            ).rejects.toThrow('Error al descargar el documento');
        });
    });

    describe('updateCredit', () => {
        const credito = {
            limiteCredito: 10000,
            diasCredito: 30,
            creditoHabilitado: true
        };

        it('debe actualizar el crédito del cliente mediante PUT', async () => {
            const responseData = {
                idCliente: 10,
                ...credito
            };

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(responseData)
            } as unknown as Response);

            const result = await ClientService.updateCredit(10, credito);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/10/credito'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(credito)
                })
            );

            expect(result).toEqual(responseData);
        });

        it('debe lanzar el cuerpo de error cuando falla la actualización del crédito', async () => {
            const errorBody = {
                message: 'No se puede habilitar el crédito'
            };

            mockApiClient.mockResolvedValueOnce({
                ok: false,
                json: jest.fn().mockResolvedValueOnce(errorBody)
            } as unknown as Response);

            await expect(
                ClientService.updateCredit(10, credito)
            ).rejects.toEqual(errorBody);
        });
    });

    describe('create', () => {
        const payload: ClientRequest = {
            nombre: 'Nuevo Cliente',
            email: 'nuevo@cliente.com',
            telefono: '1234567890',
            rfc: 'XAXX010101000',
            razonSocial: 'Razon Social SA',
            direccionFiscal: 'Av. Principal 123',
            idUsoCfdi: 1,
            idRegimenFiscal: 601
        };

        it('debe crear un cliente mediante POST', async () => {
            const responseData = {
                id: 10,
                ...payload
            };

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(responseData)
            } as unknown as Response);

            const result = await ClientService.create(payload);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
            );

            expect(result).toEqual(responseData);
        });

        it('debe lanzar el cuerpo de error si falla la creación', async () => {
            const errorBody = {
                message: 'El RFC ya existe'
            };

            mockApiClient.mockResolvedValueOnce({
                ok: false,
                json: jest.fn().mockResolvedValueOnce(errorBody)
            } as unknown as Response);

            await expect(
                ClientService.create(payload)
            ).rejects.toEqual(errorBody);
        });
    });

    describe('update', () => {
        const payload: ClientRequest = {
            nombre: 'Cliente Actualizado',
            email: 'actualizado@cliente.com',
            telefono: '1234567890',
            rfc: 'XAXX010101000',
            razonSocial: 'Razon Social SA',
            direccionFiscal: 'Av. Principal 123',
            idUsoCfdi: 1,
            idRegimenFiscal: 601
        };

        it('debe actualizar un cliente mediante PUT', async () => {
            const responseData = {
                id: 10,
                ...payload
            };

            mockApiClient.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(responseData)
            } as unknown as Response);

            const result = await ClientService.update(10, payload);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/10'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
            );

            expect(result).toEqual(responseData);
        });

        it('debe lanzar el cuerpo de error cuando falla la actualización', async () => {
            const errorBody = {
                message: 'No se pudo actualizar el cliente'
            };

            mockApiClient.mockResolvedValueOnce({
                ok: false,
                json: jest.fn().mockResolvedValueOnce(errorBody)
            } as unknown as Response);

            await expect(
                ClientService.update(10, payload)
            ).rejects.toEqual(errorBody);
        });
    });

    describe('delete', () => {
        it('debe eliminar un cliente mediante DELETE', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: true
            } as unknown as Response);

            const result = await ClientService.delete(10);

            expect(mockApiClient).toHaveBeenCalledWith(
                expect.stringContaining('/clientes/10'),
                expect.objectContaining({
                    method: 'DELETE'
                })
            );

            expect(result).toBe(true);
        });

        it('debe lanzar un error cuando falla la eliminación', async () => {
            mockApiClient.mockResolvedValueOnce({
                ok: false
            } as unknown as Response);

            await expect(
                ClientService.delete(10)
            ).rejects.toThrow('Error al eliminar cliente');
        });
    });
});
