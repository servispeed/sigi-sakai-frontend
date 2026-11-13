import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import FinancePage from './page';
import { DashboardService } from '@/app/service/dashboardService';
import { CatalogService } from '@/app/service/catalogService';
import { generarReporteFinancieroPDF } from '@/app/utils/reporteFinanciero';

const mockShow = jest.fn();

jest.mock('@/app/service/dashboardService', () => ({
    DashboardService: {
        getEgresosGrafica: jest.fn(),
        getIngresosGrafica: jest.fn(),
        getTotalesCaja: jest.fn(),
        getFlujoCaja: jest.fn(),
        registrarEgreso: jest.fn(),
        registrarAjusteCaja: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getTiposMovimiento: jest.fn()
    }
}));

jest.mock('@/app/utils/reporteFinanciero', () => ({
    generarReporteFinancieroPDF: jest.fn()
}));

jest.mock('next/link', () => {
    return function MockLink({
        href,
        children,
        legacyBehavior,
        passHref
    }: {
        href: string;
        children: React.ReactNode;
        legacyBehavior?: boolean;
        passHref?: boolean;
    }) {
        return <a href={href}>{children}</a>;
    };
});

jest.mock('primereact/toast', () => {
    const React = require('react');

    return {
        Toast: React.forwardRef((_props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockShow
            }));

            return <div data-testid="toast" />;
        })
    };
});

jest.mock('primereact/button', () => ({
    Button: ({
        label,
        onClick,
        disabled,
        loading,
        tooltip,
        icon,
        ...props
    }: any) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            title={tooltip}
            aria-label={label || props['aria-label'] || tooltip || icon}
        >
            {label || props['aria-label'] || tooltip || icon}
        </button>
    )
}));

jest.mock('primereact/card', () => ({
    Card: ({ title, children }: any) => (
        <section>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    )
}));

jest.mock('primereact/chart', () => ({
    Chart: ({ type, data }: any) => (
        <div data-testid="finance-chart" data-type={type}>
            {JSON.stringify(data)}
        </div>
    )
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => {
    const React = require('react');

    return {
        DataTable: ({ value = [], children, emptyMessage, loading }: any) => {
            const columns = React.Children.toArray(children) as React.ReactElement[];

            if (loading) {
                return <div data-testid="table-loading">Cargando movimientos</div>;
            }

            if (!value.length) {
                return <div>{emptyMessage}</div>;
            }

            return (
                <table>
                    <thead>
                        <tr>
                            {columns.map((column, index) => (
                                <th key={index}>{column.props.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {value.map((row: any, rowIndex: number) => (
                            <tr key={row.id || rowIndex}>
                                {columns.map((column, columnIndex) => (
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
            );
        }
    };
});

jest.mock('primereact/dropdown', () => ({
    Dropdown: ({
        value,
        options = [],
        onChange,
        placeholder
    }: any) => (
        <select
            aria-label={placeholder || 'Seleccionar opción'}
            value={value ?? ''}
            onChange={(event) => {
                const option = options.find(
                    (item: any) => String(item.value) === event.target.value
                );

                onChange({ value: option ? option.value : null });
            }}
        >
            <option value="">{placeholder || 'Seleccionar opción'}</option>
            {options.map((option: any) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}));

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, children, footer }: any) => {
        if (!visible) return null;

        return (
            <div role="dialog" aria-label={header}>
                <h2>{header}</h2>
                {children}
                <div>{footer}</div>
            </div>
        );
    }
}));

jest.mock('primereact/inputtext', () => ({
    InputText: ({ value, onChange, placeholder }: any) => (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    )
}));

jest.mock('primereact/inputnumber', () => ({
    InputNumber: ({ value, onValueChange, placeholder }: any) => (
        <input
            type="number"
            value={value ?? ''}
            onChange={(event) =>
                onValueChange({
                    value: event.target.value === ''
                        ? null
                        : Number(event.target.value)
                })
            }
            placeholder={placeholder}
        />
    )
}));

const mockMovements = [
    {
        id: 1,
        fecha: '2026-11-10T10:30:00',
        concepto: 'Compra de papel',
        tipoMovimiento: 'EGRESO',
        monto: 1500,
        usuario: 'Usuario Uno'
    },
    {
        id: 2,
        fecha: '2026-11-11T12:00:00',
        concepto: 'Pago de cliente',
        tipoMovimiento: 'INGRESO',
        monto: 3000,
        usuario: 'Usuario Uno'
    }
];

const mockTotals = {
    totalIngresos: 10000,
    entradaCaja: 2000,
    totalEgresos: 4000,
    balance: 8000
};

const mockMovementTypes = [
    { idTipo: 1, descripcion: 'Compra de materiales' },
    { idTipo: 2, descripcion: 'Pago de servicios' },
    { idTipo: 3, descripcion: 'Ingreso por venta' }
];

const mockGraphData = {
    egresos: {
        datosGrafica: [
            { label: 'Noviembre', total: 4000 }
        ]
    },
    ingresos: {
        datosGrafica: [
            { label: 'Noviembre', value: 10000 }
        ]
    }
};

const waitForFinance = async () => {
    await screen.findByText('Información financiera');
    await screen.findByText('Movimientos recientes');
    await screen.findByText('Compra de papel');
};

describe('FinancePage - Pruebas de integración', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({ idUsuario: 7 })
        );

        (DashboardService.getEgresosGrafica as jest.Mock).mockResolvedValue(
            mockGraphData.egresos
        );

        (DashboardService.getIngresosGrafica as jest.Mock).mockResolvedValue(
            mockGraphData.ingresos
        );

        (DashboardService.getTotalesCaja as jest.Mock).mockResolvedValue(
            mockTotals
        );

        (DashboardService.getFlujoCaja as jest.Mock).mockResolvedValue(
            mockMovements
        );

        (CatalogService.getTiposMovimiento as jest.Mock).mockResolvedValue(
            mockMovementTypes
        );

        (DashboardService.registrarEgreso as jest.Mock).mockResolvedValue({});
        (DashboardService.registrarAjusteCaja as jest.Mock).mockResolvedValue(
            {}
        );

        (generarReporteFinancieroPDF as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it('debe cargar la gráfica financiera y consultar el flujo de caja', async () => {
        render(<FinancePage />);

        await waitForFinance();

        expect(DashboardService.getEgresosGrafica).toHaveBeenCalledWith('mes');
        expect(DashboardService.getIngresosGrafica).toHaveBeenCalledWith('mes');
        expect(DashboardService.getTotalesCaja).toHaveBeenCalled();
        expect(DashboardService.getFlujoCaja).toHaveBeenCalled();
        expect(CatalogService.getTiposMovimiento).toHaveBeenCalled();

        expect(screen.getByTestId('finance-chart')).toHaveAttribute(
            'data-type',
            'line'
        );

        expect(screen.getByText('Balance en caja')).toBeInTheDocument();
        expect(screen.getByText('Compra de papel')).toBeInTheDocument();
    });

    it('debe mostrar los totales de caja obtenidos del servicio', async () => {
        render(<FinancePage />);

        await waitForFinance();

        expect(screen.getByText('$8,000.00')).toBeInTheDocument();
        expect(screen.getByText('$2,000.00')).toBeInTheDocument();
    });

    it('debe cambiar el período de consulta de la gráfica', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: 'semana' }
        });

        await waitFor(() => {
            expect(DashboardService.getEgresosGrafica).toHaveBeenCalledWith(
                'semana'
            );

            expect(DashboardService.getIngresosGrafica).toHaveBeenCalledWith(
                'semana'
            );
        });
    });

    it('debe mostrar una notificación cuando falla la carga de la gráfica', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        (DashboardService.getEgresosGrafica as jest.Mock).mockRejectedValue(
            new Error('Error de gráfica')
        );

        render(<FinancePage />);

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo cargar la gráfica'
                })
            );
        });

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('debe mostrar una notificación cuando falla la carga del flujo de caja', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        (DashboardService.getFlujoCaja as jest.Mock).mockRejectedValue(
            new Error('Error de caja')
        );

        render(<FinancePage />);

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo cargar la información de caja'
                })
            );
        });

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('debe mostrar el mensaje cuando no existen movimientos', async () => {
        (DashboardService.getFlujoCaja as jest.Mock).mockResolvedValue([]);

        render(<FinancePage />);

        await screen.findByText('No hay movimientos registrados.');

        expect(screen.queryByText('Compra de papel')).not.toBeInTheDocument();
    });

    it('debe recargar los movimientos al utilizar el botón de actualización', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByTitle('Recargar tabla'));

        await waitFor(() => {
            expect(DashboardService.getFlujoCaja).toHaveBeenCalledTimes(2);
            expect(DashboardService.getTotalesCaja).toHaveBeenCalledTimes(2);
        });
    });

    it('debe abrir el diálogo para registrar un egreso', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        expect(screen.getByRole('dialog', {
            name: 'Registrar Egreso'
        })).toBeInTheDocument();

        expect(screen.getByPlaceholderText('Ej. Pago de luz, Compra de papel...'))
            .toBeInTheDocument();
    });

    it('debe impedir el registro de un egreso cuando faltan datos', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Egreso'
        }));

        expect(DashboardService.registrarEgreso).not.toHaveBeenCalled();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                detail: 'Por favor, llena todos los campos.'
            })
        );
    });

    it('debe impedir el registro de un egreso con monto igual o menor a cero', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Selecciona el tipo' }),
            { target: { value: '1' } }
        );

        fireEvent.change(
            screen.getByPlaceholderText('Ej. Pago de luz, Compra de papel...'),
            { target: { value: 'Compra de papel' } }
        );

        fireEvent.change(screen.getByPlaceholderText('$0.00'), {
            target: { value: '0' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Egreso'
        }));

        expect(DashboardService.registrarEgreso).not.toHaveBeenCalled();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                detail: 'El monto del egreso debe ser mayor a cero.'
            })
        );
    });

    it('debe registrar un egreso correctamente y actualizar el flujo de caja', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Selecciona el tipo' }),
            { target: { value: '1' } }
        );

        fireEvent.change(
            screen.getByPlaceholderText('Ej. Pago de luz, Compra de papel...'),
            { target: { value: 'Compra de tinta' } }
        );

        fireEvent.change(screen.getByPlaceholderText('$0.00'), {
            target: { value: '500' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Egreso'
        }));

        await waitFor(() => {
            expect(DashboardService.registrarEgreso).toHaveBeenCalledWith({
                concepto: 'Compra de tinta',
                monto: 500,
                idTipoMovimiento: 1,
                idUsuarioRegistro: 7
            });
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                detail: 'Movimiento registrado correctamente'
            })
        );

        await waitFor(() => {
            expect(DashboardService.getFlujoCaja).toHaveBeenCalledTimes(2);
        });

        expect(screen.queryByRole('dialog', {
            name: 'Registrar Egreso'
        })).not.toBeInTheDocument();
    });

    it('debe mostrar un error cuando no existe un usuario activo al registrar un egreso', async () => {
        localStorage.removeItem('user');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Selecciona el tipo' }),
            { target: { value: '1' } }
        );

        fireEvent.change(
            screen.getByPlaceholderText('Ej. Pago de luz, Compra de papel...'),
            { target: { value: 'Compra de tinta' } }
        );

        fireEvent.change(screen.getByPlaceholderText('$0.00'), {
            target: { value: '500' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Egreso'
        }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo identificar al usuario activo'
                })
            );
        });

        expect(DashboardService.registrarEgreso).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('debe mostrar un error cuando falla el registro de un egreso', async () => {
        (DashboardService.registrarEgreso as jest.Mock).mockRejectedValue(
            new Error('Error de registro')
        );

        jest.spyOn(console, 'error').mockImplementation();

        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Selecciona el tipo' }),
            { target: { value: '1' } }
        );

        fireEvent.change(
            screen.getByPlaceholderText('Ej. Pago de luz, Compra de papel...'),
            { target: { value: 'Compra de tinta' } }
        );

        fireEvent.change(screen.getByPlaceholderText('$0.00'), {
            target: { value: '500' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Egreso'
        }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'Error de registro'
                })
            );
        });
    });

    it('debe excluir los tipos de movimiento que correspondan a ingresos', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Registrar egreso'
        }));

        const dropdown = screen.getByRole('combobox', {
            name: 'Selecciona el tipo'
        });

        expect(within(dropdown.parentElement as HTMLElement).getByText(
            'Compra de materiales'
        )).toBeInTheDocument();

        expect(within(dropdown).queryByRole('option', {
            name: 'Ingreso por venta'
        })).not.toBeInTheDocument();
    });

    it('debe abrir el diálogo para registrar un ajuste de caja', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Ajuste de caja'
        }));

        expect(screen.getByRole('dialog', {
            name: 'Ajuste de Caja'
        })).toBeInTheDocument();

        expect(screen.getByRole('combobox', {
            name: '¿Es entrada o salida?'
        })).toBeInTheDocument();
    });

    it('debe impedir el registro de un ajuste cuando faltan datos', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Ajuste de caja'
        }));

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Ajuste'
        }));

        expect(DashboardService.registrarAjusteCaja).not.toHaveBeenCalled();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                detail: 'Por favor, llena todos los campos.'
            })
        );
    });

    it('debe registrar un ajuste de caja correctamente', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Ajuste de caja'
        }));

        fireEvent.change(
            screen.getByRole('combobox', {
                name: '¿Es entrada o salida?'
            }),
            { target: { value: 'ENTRADA' } }
        );

        fireEvent.change(
            screen.getByPlaceholderText('Ej. Fondo de caja, Compra de garrafón...'),
            { target: { value: 'Fondo inicial' } }
        );

        fireEvent.change(screen.getByPlaceholderText('$0.00'), {
            target: { value: '1000' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Ajuste'
        }));

        await waitFor(() => {
            expect(DashboardService.registrarAjusteCaja).toHaveBeenCalledWith({
                monto: 1000,
                concepto: 'Fondo inicial',
                tipoAjuste: 'ENTRADA',
                idUsuario: 7
            });
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                detail: 'Ajuste de caja registrado'
            })
        );

        await waitFor(() => {
            expect(DashboardService.getFlujoCaja).toHaveBeenCalledTimes(2);
        });

        expect(screen.queryByRole('dialog', {
            name: 'Ajuste de Caja'
        })).not.toBeInTheDocument();
    });

    it('debe impedir el registro de un ajuste con monto igual o menor a cero', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Ajuste de caja'
        }));

        fireEvent.change(
            screen.getByRole('combobox', {
                name: '¿Es entrada o salida?'
            }),
            { target: { value: 'SALIDA' } }
        );

        fireEvent.change(
            screen.getByPlaceholderText('Ej. Fondo de caja, Compra de garrafón...'),
            { target: { value: 'Retiro de efectivo' } }
        );

        fireEvent.change(screen.getByPlaceholderText('$0.00'), {
            target: { value: '-100' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar Ajuste'
        }));

        expect(DashboardService.registrarAjusteCaja).not.toHaveBeenCalled();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                detail: 'El monto del ajuste debe ser mayor a cero.'
            })
        );
    });

    it('debe mostrar un error cuando falla el registro de un ajuste', async () => {
        (DashboardService.registrarAjusteCaja as jest.Mock).mockRejectedValue(
            new Error('Error al registrar el ajuste')
        );

        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Ajuste de caja'
        }));

        const dialog = screen.getByRole('dialog', {
            name: 'Ajuste de Caja'
        });

        fireEvent.change(
            within(dialog).getByRole('combobox', {
                name: '¿Es entrada o salida?'
            }),
            { target: { value: 'SALIDA' } }
        );

        fireEvent.change(
            within(dialog).getByPlaceholderText(
                'Ej. Fondo de caja, Compra de garrafón...'
            ),
            { target: { value: 'Retiro de efectivo' } }
        );

        fireEvent.change(
            within(dialog).getByPlaceholderText('$0.00'),
            { target: { value: '100' } }
        );

        fireEvent.click(within(dialog).getByRole('button', {
            name: 'Guardar Ajuste'
        }));

        await waitFor(() => {
            expect(DashboardService.registrarAjusteCaja).toHaveBeenCalledWith({
                monto: 100,
                concepto: 'Retiro de efectivo',
                tipoAjuste: 'SALIDA',
                idUsuario: 7
            });

            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'Error al registrar el ajuste'
                })
            );
        });
    });

    it('debe generar el reporte financiero PDF correctamente', async () => {
        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Descargar reporte'
        }));

        await waitFor(() => {
            expect(generarReporteFinancieroPDF).toHaveBeenCalledWith(
                mockTotals,
                mockMovements,
                'Mes'
            );
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                detail: 'Reporte descargado correctamente'
            })
        );
    });

    it('debe mostrar un error cuando falla la generación del reporte PDF', async () => {
        (generarReporteFinancieroPDF as jest.Mock).mockRejectedValue(
            new Error('Error al generar PDF')
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        render(<FinancePage />);

        await waitForFinance();

        fireEvent.click(screen.getByRole('button', {
            name: 'Descargar reporte'
        }));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo generar el documento'
                })
            );
        });

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('debe permitir regresar al Dashboard', async () => {
        render(<FinancePage />);

        await waitForFinance();

        const backButton = screen.getByRole('button', {
            name: 'Volver'
        });

        expect(backButton.closest('a')).toHaveAttribute('href', '/');
    });

});