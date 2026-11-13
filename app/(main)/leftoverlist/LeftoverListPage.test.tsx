import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ListSobrantesPage from './page';

const mockShow = jest.fn();
const mockGetAllSobrantes = jest.fn();
const mockGetAllProductos = jest.fn();
const mockGetById = jest.fn();
const mockConsumirSobrante = jest.fn();

jest.mock('@/app/service/leftoverService', () => ({
    SobranteService: {
        getAllSobrantes: (...args: any[]) => mockGetAllSobrantes(...args),
        consumirSobrante: (...args: any[]) => mockConsumirSobrante(...args)
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getAllProductos: (...args: any[]) => mockGetAllProductos(...args)
    }
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getById: (...args: any[]) => mockGetById(...args)
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
                show: mockShow
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
            {label || icon || tooltip}
        </button>
    )
}));

jest.mock('primereact/inputtext', () => ({
    InputText: ({ value, onChange, placeholder }: any) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    )
}));

jest.mock('primereact/tag', () => ({
    Tag: ({ value, severity }: any) => (
        <span data-testid="tag" data-severity={severity}>
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
        DataTable: ({ value = [], children, header, filters, globalFilterFields, emptyMessage, loading }: any) => {
            const columns = React.Children.toArray(children);

            const filterValue = filters?.global?.value?.toLowerCase() || '';

            const filteredData = value.filter((row: any) => {
                if (!filterValue) return true;

                return globalFilterFields.some((field: string) => {
                    const fieldValue = field.split('.').reduce(
                        (current: any, key: string) => current?.[key],
                        row
                    );

                    return String(fieldValue ?? '').toLowerCase().includes(filterValue);
                });
            });

            return (
                <div data-testid="datatable">
                    {header}
                    {loading && <span data-testid="loading">Cargando...</span>}

                    {filteredData.length === 0 ? (
                        <div>{emptyMessage}</div>
                    ) : (
                        <table>
                            <tbody>
                                {filteredData.map((row: any, index: number) => (
                                    <tr key={row.idSobrante ?? index}>
                                        {columns.map((column: any, columnIndex: number) => {
                                            const field = column.props.field;
                                            const fieldValue = field?.split('.').reduce(
                                                (current: any, key: string) => current?.[key],
                                                row
                                            );

                                            return (
                                                <td key={columnIndex}>
                                                    {column.props.body
                                                        ? column.props.body(row)
                                                        : fieldValue}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            );
        }
    };
});

jest.mock('@/app/components/ConsumeLeftoverDialog', () => ({
    ConsumeLeftoverDialog: ({ visible, onHide, onConfirm, isConsuming, maxQuantity, productName }: any) => (
        visible ? (
            <div data-testid="consume-dialog">
                <span>{productName}</span>
                <span data-testid="max-quantity">{maxQuantity}</span>
                <span data-testid="consuming">{String(isConsuming)}</span>
                <button onClick={() => onConfirm(3)}>Confirmar consumo</button>
                <button onClick={onHide}>Cerrar diálogo</button>
            </div>
        ) : null
    )
}));

const sobrantesMock = [
    {
        idSobrante: 1,
        idCliente: 10,
        cantidadDisponible: 15,
        fechaRegistro: '2026-10-20T10:00:00',
        producto: {
            idProducto: 101
        },
        ordenOrigen: {
            idOrden: 100
        }
    },
    {
        idSobrante: 2,
        idCliente: 20,
        cantidadDisponible: 5,
        fechaRegistro: '2026-10-21T12:00:00',
        producto: {
            idProducto: 102
        },
        ordenOrigen: {
            idOrden: 200
        }
    },
    {
        idSobrante: 3,
        idCliente: 10,
        cantidadDisponible: 0,
        fechaRegistro: '2026-10-22T14:00:00',
        producto: {
            idProducto: 999
        },
        ordenOrigen: null
    }
];

const productosMock = [
    {
        idProducto: 101,
        descripcion: 'Lona impresa'
    },
    {
        idProducto: 102,
        nombre: 'Tinta para impresora'
    }
];

const renderAndWait = async () => {
    const utils = render(<ListSobrantesPage />);
    await waitFor(() => {
        expect(mockGetAllSobrantes).toHaveBeenCalled();
    });
    return utils;
};

describe('ListSobrantesPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockGetAllSobrantes.mockResolvedValue({
            content: sobrantesMock
        });

        mockGetAllProductos.mockResolvedValue(productosMock);

        mockGetById.mockImplementation(async (id: number) => ({
            id,
            nombre: id === 10 ? 'Cliente A' : 'Cliente B'
        }));

        mockConsumirSobrante.mockResolvedValue({});
    });

    it('debe renderizar el título y la descripción de la página', async () => {
        await renderAndWait();

        expect(screen.getByText('Inventario de sobrantes')).toBeInTheDocument();
        expect(
            screen.getByText('Material disponible de ordenes sobrantes de los clientes')
        ).toBeInTheDocument();
    });

    it('debe cargar los sobrantes al montar el componente', async () => {
        await renderAndWait();

        expect(mockGetAllSobrantes).toHaveBeenCalledWith(0, 1000);
    });

    it('debe mostrar los registros del inventario', async () => {
        await renderAndWait();

        expect(await screen.findAllByText('Cliente A')).toHaveLength(2);
        expect(screen.getByText('Cliente B')).toBeInTheDocument();
        expect(screen.getByText('Lona impresa')).toBeInTheDocument();
        expect(screen.getByText('Tinta para impresora')).toBeInTheDocument();
    });

    it('debe obtener los productos del catálogo', async () => {
        await renderAndWait();

        expect(mockGetAllProductos).toHaveBeenCalledTimes(1);
    });

    it('debe obtener los clientes únicos para enriquecer los registros', async () => {
        await renderAndWait();

        expect(mockGetById).toHaveBeenCalledTimes(2);
        expect(mockGetById).toHaveBeenCalledWith(10);
        expect(mockGetById).toHaveBeenCalledWith(20);
    });

    it('debe utilizar el nombre alternativo cuando el producto no existe en el catálogo', async () => {
        await renderAndWait();

        expect(await screen.findByText('Producto #999')).toBeInTheDocument();
    });

    it('debe utilizar el nombre alternativo cuando falla la consulta de un cliente', async () => {
        mockGetById.mockImplementation(async (id: number) => {
            if (id === 20) {
                throw new Error('Error al obtener cliente');
            }

            return { nombre: 'Cliente A' };
        });

        await renderAndWait();

        expect(await screen.findByText('Cliente #20')).toBeInTheDocument();
    });

    it('debe continuar mostrando los sobrantes cuando falla la carga del catálogo', async () => {
        mockGetAllProductos.mockRejectedValue(new Error('Error del catálogo'));

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        await renderAndWait();

        expect(await screen.findAllByText('Cliente A')).toHaveLength(2);
        expect(screen.getByText('Producto #101')).toBeInTheDocument();

        warnSpy.mockRestore();
    });

    it('debe mostrar un mensaje de error cuando falla la carga de sobrantes', async () => {
        mockGetAllSobrantes.mockRejectedValue(new Error('Error del servicio'));

        render(<ListSobrantesPage />);

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo cargar el inventario de sobrantes'
            });
        });
    });

    it('debe manejar una respuesta sin contenido', async () => {
        mockGetAllSobrantes.mockResolvedValue({});

        render(<ListSobrantesPage />);

        expect(
            await screen.findByText('No se encontraron registros en el inventario.')
        ).toBeInTheDocument();
    });

    it('debe mostrar la orden de origen de cada sobrante', async () => {
        await renderAndWait();

        expect(await screen.findByText('#100')).toBeInTheDocument();
        expect(screen.getByText('#200')).toBeInTheDocument();
    });

    it('debe mostrar la cantidad disponible con su unidad', async () => {
        await renderAndWait();

        expect(await screen.findByText('15 und.')).toBeInTheDocument();
        expect(screen.getByText('5 und.')).toBeInTheDocument();
        expect(screen.getByText('0 und.')).toBeInTheDocument();
    });

    it('debe asignar severidad success a cantidades mayores de diez', async () => {
        await renderAndWait();

        const tag = await screen.findByText('15 und.');

        expect(tag).toHaveAttribute('data-severity', 'success');
    });

    it('debe asignar severidad warning a cantidades menores o iguales a diez', async () => {
        await renderAndWait();

        const tag = await screen.findByText('5 und.');

        expect(tag).toHaveAttribute('data-severity', 'warning');
    });

    it('debe mostrar el campo de búsqueda', async () => {
        await renderAndWait();

        expect(
            screen.getByPlaceholderText('Buscar cliente o producto...')
        ).toBeInTheDocument();
    });

    it('debe filtrar los registros por nombre de cliente', async () => {
        await renderAndWait();

        expect(await screen.findAllByText('Cliente A')).toHaveLength(2);

        fireEvent.change(
            screen.getByPlaceholderText('Buscar cliente o producto...'),
            { target: { value: 'Cliente B' } }
        );

        expect(screen.getByText('Cliente B')).toBeInTheDocument();
        expect(screen.queryByText('Lona impresa')).not.toBeInTheDocument();
        expect(screen.queryByText('Cliente A')).not.toBeInTheDocument();
    });

    it('debe filtrar los registros por nombre de producto', async () => {
        await renderAndWait();

        await screen.findByText('Lona impresa');

        fireEvent.change(
            screen.getByPlaceholderText('Buscar cliente o producto...'),
            { target: { value: 'Tinta' } }
        );

        expect(screen.getByText('Tinta para impresora')).toBeInTheDocument();
        expect(screen.queryByText('Lona impresa')).not.toBeInTheDocument();
    });

    it('debe filtrar los registros por número de orden', async () => {
        await renderAndWait();

        await screen.findByText('#100');

        fireEvent.change(
            screen.getByPlaceholderText('Buscar cliente o producto...'),
            { target: { value: '200' } }
        );

        expect(screen.getByText('#200')).toBeInTheDocument();
        expect(screen.queryByText('#100')).not.toBeInTheDocument();
    });

    it('debe mostrar el mensaje cuando no existen resultados para la búsqueda', async () => {
        await renderAndWait();

        expect(await screen.findAllByText('Cliente A')).toHaveLength(2);

        fireEvent.change(
            screen.getByPlaceholderText('Buscar cliente o producto...'),
            { target: { value: 'Producto inexistente' } }
        );

        expect(
            screen.getByText('No se encontraron registros en el inventario.')
        ).toBeInTheDocument();
    });

    it('debe recargar los datos al seleccionar el botón de actualizar', async () => {
        await renderAndWait();

        expect(mockGetAllSobrantes).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTitle('Recargar'));

        await waitFor(() => {
            expect(mockGetAllSobrantes).toHaveBeenCalledTimes(2);
        });

        await waitFor(() => {
            expect(screen.getByText('Lona impresa')).toBeInTheDocument();
        });
    });

    it('debe mostrar el botón Consumir para los registros', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        expect(buttons).toHaveLength(3);
    });

    it('debe deshabilitar el botón Consumir cuando no hay cantidad disponible', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        expect(buttons[0]).not.toBeDisabled();
        expect(buttons[1]).not.toBeDisabled();
        expect(buttons[2]).toBeDisabled();
    });

    it('debe abrir el diálogo de consumo con los datos del sobrante seleccionado', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);

        const dialog = screen.getByTestId('consume-dialog');

        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('Lona impresa')).toBeInTheDocument();
        expect(screen.getByTestId('max-quantity')).toHaveTextContent('15');
    });

    it('debe abrir el diálogo con el producto correspondiente al registro seleccionado', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[1]);

        const dialog = screen.getByTestId('consume-dialog');

        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('Tinta para impresora')).toBeInTheDocument();
        expect(screen.getByTestId('max-quantity')).toHaveTextContent('5');
    });

    it('debe cerrar el diálogo al seleccionar cerrar', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));

        expect(screen.queryByTestId('consume-dialog')).not.toBeInTheDocument();
    });

    it('debe consumir la cantidad solicitada', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(mockConsumirSobrante).toHaveBeenCalledWith(1, 3);
        });
    });

    it('debe mostrar una notificación de éxito después de consumir sobrantes', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'Inventario actualizado',
                detail: 'Se descontaron 3 unidades.'
            });
        });
    });

    it('debe cerrar el diálogo después de consumir sobrantes correctamente', async () => {
        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(screen.queryByTestId('consume-dialog')).not.toBeInTheDocument();
        });
    });

    it('debe recargar el inventario después de consumir sobrantes', async () => {
        await renderAndWait();

        expect(mockGetAllSobrantes).toHaveBeenCalledTimes(1);

        const consumeButtons = await screen.findAllByRole('button', {
            name: /consumir/i
        });

        fireEvent.click(consumeButtons[0]);

        expect(screen.getByTestId('consume-dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar consumo'
        }));

        await waitFor(() => {
            expect(mockConsumirSobrante).toHaveBeenCalledWith(1, 3);
        });

        await waitFor(() => {
            expect(mockGetAllSobrantes).toHaveBeenCalledTimes(2);
        });
    });

    it('debe mostrar un mensaje de error cuando falla el consumo', async () => {
        mockConsumirSobrante.mockRejectedValue(new Error('No hay suficiente material'));

        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error',
                detail: 'No hay suficiente material'
            });
        });
    });

    it('debe mostrar un mensaje genérico cuando el error de consumo no contiene mensaje', async () => {
        mockConsumirSobrante.mockRejectedValue({});

        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo descontar el material.'
            });
        });
    });

    it('debe mantener abierto el diálogo cuando falla el consumo', async () => {
        mockConsumirSobrante.mockRejectedValue(new Error('Error de consumo'));

        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(screen.getByTestId('consume-dialog')).toBeInTheDocument();
        });
    });

    it('debe actualizar el estado de consumo mientras se procesa la solicitud', async () => {
        let resolveConsume: () => void = () => { };

        mockConsumirSobrante.mockImplementation(
            () => new Promise<void>((resolve) => {
                resolveConsume = resolve;
            })
        );

        await renderAndWait();

        const buttons = await screen.findAllByRole('button', { name: 'Consumir' });

        fireEvent.click(buttons[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar consumo' }));

        await waitFor(() => {
            expect(screen.getByTestId('consuming')).toHaveTextContent('true');
        });

        resolveConsume();

        await waitFor(() => {
            expect(screen.queryByTestId('consume-dialog')).not.toBeInTheDocument();
        });
    });
});