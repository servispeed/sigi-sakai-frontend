
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreditApplicationDialog } from './CreditApplicationDialog';
import { ClientService } from '@/app/service/clientService';

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        uploadDocuments: jest.fn(),
        updateCredit: jest.fn()
    }
}));

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, children, onHide }: any) =>
        visible ? (
            <div role="dialog" aria-label={header}>
                <h2>{header}</h2>
                <button type="button" onClick={onHide} aria-label="Cerrar diálogo">
                    Cerrar
                </button>
                {children}
            </div>
        ) : null
}));

jest.mock('primereact/button', () => ({
    Button: ({ label, onClick, type = 'button', disabled, loading }: any) => (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {label}
        </button>
    )
}));

jest.mock('primereact/fileupload', () => ({
    FileUpload: ({ name, chooseLabel, onSelect, disabled }: any) => (
        <div>
            <label htmlFor={`file-${name}`}>{chooseLabel}</label>
            <input
                id={`file-${name}`}
                type="file"
                disabled={disabled}
                onChange={(e) =>
                    onSelect({
                        files: Array.from(e.target.files || [])
                    })
                }
            />
        </div>
    )
}));

jest.mock('primereact/inputnumber', () => ({
    InputNumber: ({ value, onValueChange, disabled }: any) => (
        <input
            aria-label="Límite de crédito"
            type="number"
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) =>
                onValueChange({
                    value: e.target.value === '' ? null : Number(e.target.value)
                })
            }
        />
    )
}));

jest.mock('primereact/dropdown', () => ({
    Dropdown: ({ value, options, onChange, disabled }: any) => (
        <select
            aria-label="Plazo de pago"
            value={value}
            disabled={disabled}
            onChange={(e) =>
                onChange({ value: Number(e.target.value) })
            }
        >
            {options.map((option: any) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}));

const mockUploadDocuments = ClientService.uploadDocuments as jest.Mock;
const mockUpdateCredit = ClientService.updateCredit as jest.Mock;

const client = {
    id: 1,
    nombre: 'Cliente de prueba',
    email: 'cliente@prueba.com',
    rfc: 'XAXX010101000'
} as any;

const createFile = (name: string) =>
    new File(['contenido'], name, { type: 'application/pdf' });

const selectDocuments = () => {
    const csf = createFile('csf.pdf');
    const domicilio = createFile('domicilio.pdf');
    const ine = createFile('ine.pdf');

    fireEvent.change(screen.getByLabelText('Seleccionar CSF'), {
        target: { files: [csf] }
    });

    fireEvent.change(screen.getByLabelText('Seleccionar Comprobante'), {
        target: { files: [domicilio] }
    });

    fireEvent.change(screen.getByLabelText('Seleccionar INE'), {
        target: { files: [ine] }
    });

    return { csf, domicilio, ine };
};

const renderDialog = (props: any = {}) => {
    const defaultProps = {
        visible: true,
        client,
        onHide: jest.fn(),
        onSuccess: jest.fn(),
        onError: jest.fn()
    };

    const result = render(
        <CreditApplicationDialog {...defaultProps} {...props} />
    );

    return {
        ...result,
        props: { ...defaultProps, ...props }
    };
};

describe('CreditApplicationDialog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUploadDocuments.mockResolvedValue(undefined);
        mockUpdateCredit.mockResolvedValue(undefined);
    });

    it('debe mostrar el diálogo con los datos del cliente', () => {
        renderDialog();

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(
            screen.getByText('Cliente de prueba', { selector: 'b' })
        ).toBeInTheDocument();

        expect(
            screen.getByText('1. Documentación requerida')
        ).toBeInTheDocument();

        expect(
            screen.getByText('2. Condiciones del crédito')
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        ).toBeInTheDocument();
    });

    it('no debe mostrar el diálogo cuando visible es false', () => {
        renderDialog({ visible: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('debe mostrar un error cuando no se adjuntan todos los documentos', async () => {
        const { props } = renderDialog();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        expect(props.onError).toHaveBeenCalledWith(
            'Debes adjuntar todos los documentos requeridos.'
        );

        expect(mockUploadDocuments).not.toHaveBeenCalled();
        expect(mockUpdateCredit).not.toHaveBeenCalled();
        expect(props.onSuccess).not.toHaveBeenCalled();
    });

    it('debe mostrar un error cuando el límite de crédito es cero', async () => {
        const { props } = renderDialog();

        selectDocuments();

        fireEvent.change(screen.getByLabelText('Límite de crédito'), {
            target: { value: '0' }
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        expect(props.onError).toHaveBeenCalledWith(
            'Ingresa un límite de crédito válido.'
        );

        expect(mockUploadDocuments).not.toHaveBeenCalled();
        expect(mockUpdateCredit).not.toHaveBeenCalled();
    });

    it('debe mostrar un error cuando el límite de crédito es negativo', () => {
        const { props } = renderDialog();

        selectDocuments();

        fireEvent.change(screen.getByLabelText('Límite de crédito'), {
            target: { value: '-100' }
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        expect(props.onError).toHaveBeenCalledWith(
            'Ingresa un límite de crédito válido.'
        );

        expect(mockUploadDocuments).not.toHaveBeenCalled();
    });

    it('debe permitir establecer el límite y plazo de crédito', () => {
        renderDialog();

        expect(screen.getByLabelText('Límite de crédito')).toHaveValue(25000);
        expect(screen.getByLabelText('Plazo de pago')).toHaveValue('30');

        fireEvent.change(screen.getByLabelText('Límite de crédito'), {
            target: { value: '15000' }
        });

        fireEvent.change(screen.getByLabelText('Plazo de pago'), {
            target: { value: '15' }
        });

        expect(screen.getByLabelText('Límite de crédito')).toHaveValue(15000);
        expect(screen.getByLabelText('Plazo de pago')).toHaveValue('15');
    });

    it('debe subir los documentos y habilitar el crédito correctamente', async () => {
        const { props } = renderDialog();
        const files = selectDocuments();

        fireEvent.change(screen.getByLabelText('Límite de crédito'), {
            target: { value: '15000' }
        });

        fireEvent.change(screen.getByLabelText('Plazo de pago'), {
            target: { value: '15' }
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(mockUploadDocuments).toHaveBeenCalledWith(1, {
                csf: files.csf,
                comprobanteDomicilio: files.domicilio,
                ine: files.ine
            });
        });

        await waitFor(() => {
            expect(mockUpdateCredit).toHaveBeenCalledWith(1, {
                limiteCredito: 15000,
                diasCredito: 15,
                creditoHabilitado: true
            });
        });

        expect(props.onSuccess).toHaveBeenCalledTimes(1);
        expect(props.onError).not.toHaveBeenCalled();
    });

    it('debe utilizar las condiciones de crédito predeterminadas', async () => {
        renderDialog();
        selectDocuments();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(mockUpdateCredit).toHaveBeenCalledWith(1, {
                limiteCredito: 25000,
                diasCredito: 30,
                creditoHabilitado: true
            });
        });
    });

    it('debe mostrar un error cuando falla la carga de documentos', async () => {
        const { props } = renderDialog();

        mockUploadDocuments.mockRejectedValueOnce(
            new Error('Error al subir los documentos')
        );

        selectDocuments();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onError).toHaveBeenCalledWith(
                'Error al subir los documentos'
            );
        });

        expect(mockUpdateCredit).not.toHaveBeenCalled();
        expect(props.onSuccess).not.toHaveBeenCalled();
    });

    it('debe mostrar un error cuando falla la actualización del crédito', async () => {
        const { props } = renderDialog();

        mockUpdateCredit.mockRejectedValueOnce(
            new Error('No se pudo habilitar el crédito')
        );

        selectDocuments();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onError).toHaveBeenCalledWith(
                'No se pudo habilitar el crédito'
            );
        });

        expect(mockUploadDocuments).toHaveBeenCalledTimes(1);
        expect(props.onSuccess).not.toHaveBeenCalled();
    });

    it('debe mostrar un mensaje predeterminado cuando ocurre un error sin mensaje', async () => {
        const { props } = renderDialog();

        mockUpdateCredit.mockRejectedValueOnce({});

        selectDocuments();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onError).toHaveBeenCalledWith(
                'Error al procesar la solicitud de crédito'
            );
        });
    });

    it('no debe volver a subir los documentos si ya fueron cargados correctamente', async () => {
        const { props } = renderDialog();

        selectDocuments();

        mockUpdateCredit
            .mockRejectedValueOnce(new Error('Error al actualizar'))
            .mockResolvedValueOnce(undefined);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onError).toHaveBeenCalledWith('Error al actualizar');
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onSuccess).toHaveBeenCalledTimes(1);
        });

        expect(mockUploadDocuments).toHaveBeenCalledTimes(1);
        expect(mockUpdateCredit).toHaveBeenCalledTimes(2);
    });

    it('debe volver a subir los documentos cuando se selecciona uno nuevo', async () => {
        const { props } = renderDialog();

        selectDocuments();

        mockUpdateCredit.mockRejectedValueOnce(
            new Error('Error al actualizar')
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onError).toHaveBeenCalledWith('Error al actualizar');
        });

        fireEvent.change(screen.getByLabelText('csf.pdf'), {
            target: { files: [createFile('nuevo-csf.pdf')] }
        });

        mockUpdateCredit.mockResolvedValueOnce(undefined);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(props.onSuccess).toHaveBeenCalledTimes(1);
        });

        expect(mockUploadDocuments).toHaveBeenCalledTimes(2);
        expect(mockUpdateCredit).toHaveBeenCalledTimes(2);
    });

    it('debe cerrar el diálogo al cancelar', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(props.onHide).toHaveBeenCalledTimes(1);
    });

    it('debe cerrar el diálogo y reiniciar los campos al utilizar onHide', () => {
        const { props } = renderDialog();

        selectDocuments();

        fireEvent.click(screen.getByRole('button', {
            name: 'Cerrar diálogo'
        }));

        expect(props.onHide).toHaveBeenCalledTimes(1);
    });

    it('no debe cerrar el diálogo cuando no existe un cliente válido', async () => {
        const { props } = renderDialog({ client: null });

        selectDocuments();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Subir documentos y habilitar crédito'
            })
        );

        await waitFor(() => {
            expect(mockUploadDocuments).not.toHaveBeenCalled();
            expect(mockUpdateCredit).not.toHaveBeenCalled();
        });

        expect(props.onSuccess).not.toHaveBeenCalled();
    });
});
