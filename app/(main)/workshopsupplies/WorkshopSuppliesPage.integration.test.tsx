import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SuppliesVerificationPage from './page';
import { OrderService } from '@/app/service/orderService';
import { CatalogService } from '@/app/service/catalogService';
import { ClientService } from '@/app/service/clientService';

const mockPush = jest.fn();
const mockShow = jest.fn();

jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: () => '101'
    }),
    useRouter: () => ({
        push: mockPush
    })
}));

jest.mock('next/link', () => {
    return function MockLink({
        href,
        children,
        legacyBehavior,
        passHref,
        ...props
    }: {
        href: string;
        children: React.ReactNode;
        legacyBehavior?: boolean;
        passHref?: boolean;
        [key: string]: unknown;
    }) {
        if (legacyBehavior) {
            return React.cloneElement(children as React.ReactElement, {
                href,
                ...props
            });
        }

        return <a href={href} {...props}>{children}</a>;
    };
});

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getOrdenById: jest.fn(),
        avanzarEstatus: jest.fn(),
        crearSolicitudCompra: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getAllProductos: jest.fn()
    }
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getById: jest.fn()
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

jest.mock('primereact/card', () => ({
    Card: ({ title, children }: any) => (
        <section>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    )
}));

jest.mock('primereact/button', () => ({
    Button: ({
        children,
        label,
        onClick,
        disabled,
        loading,
        ...props
    }: any) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            {...props}
        >
            {label || children}
        </button>
    )
}));

jest.mock('primereact/inputtext', () => ({
    InputText: (props: any) => <input {...props} />
}));

jest.mock('primereact/inputtextarea', () => ({
    InputTextarea: (props: any) => <textarea {...props} />
}));

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, children, footer, onHide }: any) => {
        if (!visible) return null;

        return (
            <div role="dialog">
                <div>{header}</div>
                {children}
                {footer}
                <button onClick={onHide}>Cerrar diálogo</button>
            </div>
        );
    }
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => ({
    DataTable: ({
        value = [],
        selection = [],
        onSelectionChange,
        dataKey,
        children
    }: any) => {
        const columns = React.Children.toArray(children) as React.ReactElement[];

        return (
            <table>
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th key={index}>{column.props.header || ''}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {value.map((row: any, rowIndex: number) => (
                        <tr key={row[dataKey] ?? rowIndex}>
                            {columns.map((column, columnIndex) => {
                                const { selectionMode } = column.props;

                                if (selectionMode === 'multiple') {
                                    const selected = selection.some(
                                        (item: any) => item[dataKey] === row[dataKey]
                                    );

                                    return (
                                        <td key={columnIndex}>
                                            <input
                                                type="checkbox"
                                                aria-label={`Seleccionar ${row.nombreProducto}`}
                                                checked={selected}
                                                onChange={() => {
                                                    const nextSelection = selected
                                                        ? selection.filter(
                                                            (item: any) => item[dataKey] !== row[dataKey]
                                                        )
                                                        : [...selection, row];

                                                    onSelectionChange?.({
                                                        value: nextSelection
                                                    });
                                                }}
                                            />
                                        </td>
                                    );
                                }

                                const content = column.props.body
                                    ? typeof column.props.body === 'function'
                                        ? column.props.body(row)
                                        : column.props.body
                                    : row[column.props.field];

                                return <td key={columnIndex}>{content}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
}));

const mockOrder = {
    idOrden: 101,
    idCliente: 1,
    fechaEntregaFormal: '2026-11-20',
    montoTotal: 2500,
    detalles: [
        {
            idDetalle: 1,
            idProducto: 10,
            cantidad: 25
        },
        {
            idDetalle: 2,
            idProducto: 20,
            cantidad: 100
        }
    ]
};

const mockProducts = [
    {
        idProducto: 10,
        descripcion: 'Tarjetas de presentación',
        unidadVenta: 'pzas',
        cantidadPaquete: 100,
        precioPaquete: 200
    },
    {
        idProducto: 20,
        descripcion: 'Hojas de papel',
        unidadVenta: 'hojas',
        cantidadPaquete: 1,
        precioPaquete: 0
    }
];

const mockClient = {
    id: 1,
    nombre: 'Empresa Uno'
};

const waitForInitialLoad = async () => {
    await screen.findByText('Verificación de insumos orden #101');
    await screen.findByText('Empresa Uno');
};

describe('SuppliesVerificationPage - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
            if (key === 'user') {
                return JSON.stringify({ idUsuario: 15 });
            }
            return null;
        });

        (OrderService.getOrdenById as jest.Mock).mockResolvedValue(mockOrder);
        (CatalogService.getAllProductos as jest.Mock).mockResolvedValue(mockProducts);
        (ClientService.getById as jest.Mock).mockResolvedValue(mockClient);
        (OrderService.avanzarEstatus as jest.Mock).mockResolvedValue({});
        (OrderService.crearSolicitudCompra as jest.Mock).mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('debe cargar la orden, los productos y el cliente', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        expect(OrderService.getOrdenById).toHaveBeenCalledWith(101);
        expect(CatalogService.getAllProductos).toHaveBeenCalled();
        expect(ClientService.getById).toHaveBeenCalledWith(1);

        expect(screen.getByText('Tarjetas de presentación')).toBeInTheDocument();
        expect(screen.getByText('Hojas de papel')).toBeInTheDocument();
        expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    });

    it('debe mostrar Cliente Mostrador cuando la orden no tiene cliente', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idCliente: null
        });

        render(<SuppliesVerificationPage />);

        expect(await screen.findByText('Cliente Mostrador')).toBeInTheDocument();
        expect(ClientService.getById).not.toHaveBeenCalled();
    });

    it('debe mostrar la presentación de los productos', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        expect(screen.getByText('Paq. de 100')).toBeInTheDocument();
        expect(screen.getByText('Unitario')).toBeInTheDocument();
    });

    it('debe permitir regresar a la lista de taller', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        expect(screen.getByRole('link').closest('a')).toHaveAttribute(
            'href',
            '/workshoplist'
        );
    });

    it('debe confirmar los insumos y avanzar al estatus 3', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Confirmar existencia'));

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
                idUsuario: 15,
                idEstatusDestino: 3,
                hayInsumos: true,
                clienteAprobo: false
            });
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Insumos Confirmados'
            })
        );
    });

    it('debe abrir el diálogo para reportar materiales faltantes', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Solicitar insumos')).toBeInTheDocument();
        expect(screen.getByText('Cantidad a pedir')).toBeInTheDocument();
    });

    it('debe calcular la cantidad sugerida según el tamaño del paquete', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar Tarjetas de presentación'
            })
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText('1 Paquetes')).toHaveValue('1 Paquetes');
        });
    });

    it('debe calcular la cantidad sugerida para productos unitarios', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar Hojas de papel'
            })
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText('100')).toHaveValue('100');
        });
    });

    it('debe permitir modificar la cantidad a solicitar', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar Tarjetas de presentación'
            })
        );

        const quantityInput = await screen.findByPlaceholderText('1 Paquetes');

        fireEvent.change(quantityInput, {
            target: { value: '3 Paquetes' }
        });

        expect(quantityInput).toHaveValue('3 Paquetes');
    });

    it('debe permitir agregar notas a la solicitud', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.change(screen.getByLabelText(/Notas generales para compras/), {
            target: { value: 'Material urgente' }
        });

        expect(screen.getByLabelText(/Notas generales para compras/))
            .toHaveValue('Material urgente');
    });

    it('debe impedir enviar una solicitud sin productos seleccionados', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        expect(
            screen.getByRole('button', { name: 'Enviar Solicitud' })
        ).toBeDisabled();

        expect(OrderService.crearSolicitudCompra).not.toHaveBeenCalled();
    });

    it('debe crear la solicitud y avanzar al estatus 4', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar Tarjetas de presentación'
            })
        );

        fireEvent.change(screen.getByLabelText(/Notas generales para compras/), {
            target: { value: 'Compra urgente' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud' }));

        await waitFor(() => {
            expect(OrderService.crearSolicitudCompra).toHaveBeenCalledWith({
                idUsuario: 15,
                idOrden: 101,
                descripcionGeneral: 'Compra urgente',
                productos: [
                    {
                        idProducto: 10,
                        cantidad: '1 Paquetes'
                    }
                ]
            });
        });

        expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
            idUsuario: 15,
            idEstatusDestino: 4,
            hayInsumos: false
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Solicitud Creada'
            })
        );
    });

    it('debe usar una descripción predeterminada cuando no se agregan notas', async () => {
        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar Hojas de papel'
            })
        );

        fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud' }));

        await waitFor(() => {
            expect(OrderService.crearSolicitudCompra).toHaveBeenCalledWith(
                expect.objectContaining({
                    descripcionGeneral: 'Solicitud de insumos'
                })
            );
        });
    });

    it('debe mostrar un error cuando falla la carga de la orden', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        (OrderService.getOrdenById as jest.Mock).mockRejectedValue(
            new Error('Error de carga')
        );

        render(<SuppliesVerificationPage />);

        await waitFor(() => {
            expect(screen.getByText('No se encontró la orden.')).toBeInTheDocument();
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'error',
                detail: 'No se pudo cargar la orden.'
            })
        );

        expect(consoleError).toHaveBeenCalled();
    });

    it('debe mostrar un error cuando falla la confirmación de insumos', async () => {
        (OrderService.avanzarEstatus as jest.Mock).mockRejectedValue(
            new Error('No se pudo actualizar')
        );

        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Confirmar existencia'));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo actualizar'
                })
            );
        });
    });

    it('debe mostrar un error cuando falla la creación de la solicitud', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        (OrderService.crearSolicitudCompra as jest.Mock).mockRejectedValue(
            new Error('Error de compras')
        );

        render(<SuppliesVerificationPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Falta material'));

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar Hojas de papel'
            })
        );

        fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud' }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'Error de compras'
                })
            );
        });

        expect(consoleError).toHaveBeenCalled();
    });
});
