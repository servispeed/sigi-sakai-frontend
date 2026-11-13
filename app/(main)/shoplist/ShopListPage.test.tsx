import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListSolicitudesPendientesPage from '@/app/(main)/shoplist/page';
import { comprasService } from '@/app/service/shopService';
import { CatalogService } from '@/app/service/catalogService';

const mockPush = jest.fn();
const mockToastShow = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush
    })
}));

jest.mock('@/app/service/shopService', () => ({
    comprasService: {
        getPendientes: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getProductos: jest.fn()
    }
}));

jest.mock('primereact/api', () => ({
    FilterMatchMode: {
        CONTAINS: 'contains'
    }
}));

jest.mock('primereact/toast', () => {
    const React = require('react');

    return {
        Toast: React.forwardRef((props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockToastShow
            }));

            return <div data-testid="toast" />;
        })
    };
});

jest.mock('primereact/button', () => ({
    Button: ({ label, icon, onClick, disabled, tooltip }: any) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={tooltip}
            aria-label={label || tooltip || icon || 'Botón'}
        >
            {label || tooltip || icon}
        </button>
    )
}));

jest.mock('primereact/inputtext', () => ({
    InputText: (props: any) => (
        <input
            {...props}
            aria-label="Buscar solicitudes"
        />
    )
}));

jest.mock('primereact/tag', () => ({
    Tag: ({ value, severity }: any) => (
        <span data-testid={`tag-${severity}`}>
            {value}
        </span>
    )
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => {
    const React = require('react');

    return {
        DataTable: ({
            value = [],
            children,
            header,
            filters,
            globalFilterFields = [],
            emptyMessage,
            loading
        }: any) => {
            const columns = React.Children.toArray(children);

            const searchValue = filters?.global?.value?.toLowerCase() || '';

            const filteredData = value.filter((row: any) => {
                if (!searchValue) return true;

                return globalFilterFields.some((field: string) =>
                    String(row[field] ?? '')
                        .toLowerCase()
                        .includes(searchValue)
                );
            });

            return (
                <div data-testid="datatable">
                    {header}

                    <span data-testid="table-loading">
                        {String(loading)}
                    </span>

                    {filteredData.length > 0 ? (
                        <table>
                            <tbody>
                                {filteredData.map((row: any, index: number) => (
                                    <tr key={row.idSolicitud ?? index}>
                                        {columns.map((column: any, columnIndex: number) => (
                                            <td key={columnIndex}>
                                                {column.props.body
                                                    ? column.props.body(row)
                                                    : row[column.props.field]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>{emptyMessage}</p>
                    )}
                </div>
            );
        }
    };
});

describe('ListSolicitudesPendientesPage', () => {
    const mockGetPendientes = comprasService.getPendientes as jest.Mock;
    const mockGetProductos = CatalogService.getProductos as jest.Mock;

    const solicitudesMock = [
        {
            idSolicitud: 1,
            idOrden: 100,
            idEstatus: 1,
            descripcionSolicitud: 'Compra de materiales para impresión',
            fechaCreacion: '2026-11-10T10:30:00',
            detalles: [
                {
                    idProducto: 101,
                    cantidad: 5
                },
                {
                    idProducto: 102,
                    cantidad: 3
                }
            ]
        },
        {
            idSolicitud: 2,
            idOrden: 200,
            idEstatus: 3,
            descripcionSolicitud: 'Material pendiente de entrega',
            fechaCreacion: '2026-11-11T12:00:00',
            detalles: [
                {
                    idProducto: 101,
                    cantidad: 2
                }
            ]
        },
        {
            idSolicitud: 3,
            idOrden: null,
            idEstatus: 1,
            descripcionSolicitud: '',
            fechaCreacion: '2026-11-12T09:00:00',
            detalles: []
        }
    ];

    const productosMock = [
        {
            idProducto: 101,
            descripcion: 'Lona impresa'
        },
        {
            idProducto: 102,
            descripcion: 'Tinta para impresora'
        }
    ];

    const renderPage = () => render(<ListSolicitudesPendientesPage />);

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetPendientes.mockResolvedValue(solicitudesMock);
        mockGetProductos.mockResolvedValue(productosMock);
    });

    it('debe mostrar el título y la descripción de la página', async () => {
        renderPage();

        expect(screen.getByText(
            'Solicitudes de insumos pendientes de compra'
        )).toBeInTheDocument();

        expect(screen.getByText(
            /Atiende las solicitudes a la brevedad/
        )).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetPendientes).toHaveBeenCalledTimes(1);
        });
    });

    it('debe cargar las solicitudes pendientes al montar la página', async () => {
        renderPage();

        await waitFor(() => {
            expect(mockGetPendientes).toHaveBeenCalledTimes(1);
            expect(mockGetProductos).toHaveBeenCalledTimes(1);
        });
    });

    it('debe mostrar las solicitudes obtenidas del servicio', async () => {
        renderPage();

        expect(await screen.findByText(
            'Compra de materiales para impresión'
        )).toBeInTheDocument();

        expect(screen.getByText(
            'Material pendiente de entrega'
        )).toBeInTheDocument();
    });

    it('debe mostrar los nombres de los productos en el resumen de insumos', async () => {
        renderPage();

        expect(await screen.findByText(
            '5x Lona impresa, 3x Tinta para impresora'
        )).toBeInTheDocument();

        expect(screen.getByText('2x Lona impresa')).toBeInTheDocument();
    });

    it('debe mostrar el identificador de la orden asociada', async () => {
        renderPage();

        expect(await screen.findByText('#100')).toBeInTheDocument();
        expect(screen.getByText('#200')).toBeInTheDocument();
    });

    it('debe mostrar N/A cuando una solicitud no tiene orden asociada', async () => {
        renderPage();

        expect(await screen.findByText('N/A')).toBeInTheDocument();
    });

    it('debe mostrar el resumen de insumos genéricos cuando un detalle no tiene producto asociado', async () => {
        mockGetPendientes.mockResolvedValue([
            {
                ...solicitudesMock[0],
                detalles: [
                    {
                        cantidad: 4
                    }
                ]
            }
        ]);

        renderPage();

        expect(await screen.findByText(
            '4x Insumo Genérico'
        )).toBeInTheDocument();
    });

    it('debe mostrar el identificador del producto cuando no existe en el catálogo', async () => {
        mockGetPendientes.mockResolvedValue([
            {
                ...solicitudesMock[0],
                detalles: [
                    {
                        idProducto: 999,
                        cantidad: 2
                    }
                ]
            }
        ]);

        renderPage();

        expect(await screen.findByText(
            '2x Producto #999'
        )).toBeInTheDocument();
    });

    it('debe mostrar un mensaje cuando la solicitud no tiene detalles de insumos', async () => {
        renderPage();

        expect(await screen.findByText(
            'Sin insumos especificados'
        )).toBeInTheDocument();
    });

    it('debe continuar mostrando las solicitudes cuando falla la carga del catálogo', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        mockGetProductos.mockRejectedValueOnce(
            new Error('Error al cargar productos')
        );

        renderPage();

        expect(await screen.findByText(
            'Compra de materiales para impresión'
        )).toBeInTheDocument();

        expect(screen.getByText(
            '5x Producto #101, 3x Producto #102'
        )).toBeInTheDocument();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'No se pudieron cargar los productos para el mapeo'
        );

        consoleWarnSpy.mockRestore();
    });

    it('debe mostrar el estado pendiente para solicitudes con estatus uno', async () => {
        renderPage();

        const tags = await screen.findAllByText('PENDIENTE');

        expect(tags).toHaveLength(2);
    });

    it('debe mostrar el estado atrasado para solicitudes con estatus tres', async () => {
        renderPage();

        expect(await screen.findByText('ATRASADA')).toBeInTheDocument();
    });

    it('debe mostrar un estado desconocido para solicitudes con otro estatus', async () => {
        mockGetPendientes.mockResolvedValue([
            {
                ...solicitudesMock[0],
                idEstatus: 5
            }
        ]);

        renderPage();

        expect(await screen.findByText('DESCONOCIDO')).toBeInTheDocument();
    });

    it('debe mostrar el botón Comprar para solicitudes pendientes', async () => {
        renderPage();

        const buttons = await screen.findAllByRole('button', {
            name: 'Comprar'
        });

        expect(buttons).toHaveLength(2);
        expect(buttons.some(button => !button.hasAttribute('disabled'))).toBe(true);
    });

    it('debe mostrar el botón Llegada atrasada para solicitudes atrasadas', async () => {
        renderPage();

        expect(await screen.findByRole('button', {
            name: 'Llegada atrasada'
        })).toBeInTheDocument();
    });

    it('debe navegar al procesamiento de compra al seleccionar Comprar', async () => {
        renderPage();

        const buttons = await screen.findAllByRole('button', {
            name: 'Comprar'
        });

        const enabledButton = buttons.find(button =>
            !button.hasAttribute('disabled')
        );

        expect(enabledButton).toBeInTheDocument();

        fireEvent.click(enabledButton!);

        expect(mockPush).toHaveBeenCalledWith('/receipt?id=100');
    });

    it('debe navegar al procesamiento de compra al seleccionar Llegada atrasada', async () => {
        renderPage();

        fireEvent.click(await screen.findByRole('button', {
            name: 'Llegada atrasada'
        }));

        expect(mockPush).toHaveBeenCalledWith('/receipt?id=200');
    });

    it('debe deshabilitar la acción cuando la solicitud no tiene orden asociada', async () => {
        renderPage();

        const buttons = await screen.findAllByRole('button', {
            name: 'Comprar'
        });

        expect(buttons).toHaveLength(2);

        const disabledButton = buttons.find(button =>
            button.hasAttribute('disabled')
        );

        expect(disabledButton).toBeInTheDocument();
    });

    it('debe mostrar el tooltip correspondiente cuando no existe una orden asociada', async () => {
        renderPage();

        const buttons = await screen.findAllByRole('button', {
            name: 'Comprar'
        });

        const disabledButton = buttons.find(button =>
            button.hasAttribute('disabled')
        );

        expect(disabledButton).toHaveAttribute(
            'title',
            'No tiene orden asociada'
        );
    });

    it('debe filtrar las solicitudes por descripción', async () => {
        renderPage();

        await screen.findByText('Compra de materiales para impresión');

        fireEvent.change(screen.getByRole('textbox', {
            name: 'Buscar solicitudes'
        }), {
            target: { value: 'Material pendiente' }
        });

        expect(screen.getByText(
            'Material pendiente de entrega'
        )).toBeInTheDocument();

        expect(screen.queryByText(
            'Compra de materiales para impresión'
        )).not.toBeInTheDocument();
    });

    it('debe filtrar las solicitudes por resumen de insumos', async () => {
        renderPage();

        await screen.findByText('5x Lona impresa, 3x Tinta para impresora');

        fireEvent.change(screen.getByRole('textbox', {
            name: 'Buscar solicitudes'
        }), {
            target: { value: 'Tinta para impresora' }
        });

        expect(screen.getByText(
            'Compra de materiales para impresión'
        )).toBeInTheDocument();

        expect(screen.queryByText(
            'Material pendiente de entrega'
        )).not.toBeInTheDocument();
    });

    it('debe filtrar las solicitudes por texto de orden', async () => {
        renderPage();

        await screen.findByText('#100');

        fireEvent.change(screen.getByRole('textbox', {
            name: 'Buscar solicitudes'
        }), {
            target: { value: 'Orden #200' }
        });

        expect(screen.getByText('#200')).toBeInTheDocument();
        expect(screen.queryByText('#100')).not.toBeInTheDocument();
    });

    it('debe mostrar el mensaje de lista vacía cuando no existen solicitudes', async () => {
        mockGetPendientes.mockResolvedValue([]);

        renderPage();

        expect(await screen.findByText(
            'No hay solicitudes de insumos pendientes.'
        )).toBeInTheDocument();
    });

    it('debe mostrar un error cuando falla la carga de solicitudes', async () => {
        mockGetPendientes.mockRejectedValueOnce(
            new Error('Error de conexión')
        );

        renderPage();

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar las solicitudes pendientes.'
            });
        });
    });

    it('debe permitir recargar las solicitudes', async () => {
        renderPage();

        await screen.findByText('Compra de materiales para impresión');

        expect(mockGetPendientes).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', {
            name: 'Recargar'
        }));

        await waitFor(() => {
            expect(mockGetPendientes).toHaveBeenCalledTimes(2);
            expect(mockGetProductos).toHaveBeenCalledTimes(2);
        });
    });

    it('debe activar el estado de carga mientras se obtienen las solicitudes', async () => {
        let resolvePendientes: (value: any) => void;

        mockGetPendientes.mockImplementationOnce(
            () => new Promise(resolve => {
                resolvePendientes = resolve;
            })
        );

        renderPage();

        expect(screen.getByTestId('table-loading')).toHaveTextContent('true');

        resolvePendientes!(solicitudesMock);

        await waitFor(() => {
            expect(screen.getByTestId('table-loading')).toHaveTextContent('false');
        });
    });

    it('debe finalizar el estado de carga cuando ocurre un error', async () => {
        mockGetPendientes.mockRejectedValueOnce(
            new Error('Error de conexión')
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('table-loading')).toHaveTextContent('false');
        });
    });
});