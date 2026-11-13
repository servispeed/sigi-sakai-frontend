'use client';
import React, { useState, useRef, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { FilterMatchMode } from 'primereact/api';
import { Tag } from 'primereact/tag';

// Servicios
import { SobranteService } from '@/app/service/leftoverService';
import { CatalogService } from '@/app/service/catalogService';
import { ClientService } from '@/app/service/clientService';

// Componentes
import { ConsumeLeftoverDialog } from '@/app/components/ConsumeLeftoverDialog';

const ListSobrantesPage = () => {
    const [sobrantes, setSobrantes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS }
    });

    const toast = useRef<Toast>(null);

    // Estados para el Dialog de Consumo
    const [showConsumeDialog, setShowConsumeDialog] = useState(false);
    const [isConsuming, setIsConsuming] = useState(false);
    const [consumeData, setConsumeData] = useState<{ idSobrante: number, maxAmount: number, productName: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Traemos una página grande por defecto para permitir filtrado en frontend
            const response = await SobranteService.getAllSobrantes(0, 1000);
            const sobrantesData = response.content || [];

            // 1. Obtener todos los productos para mapear el nombre
            let productMap = new Map();
            try {
                const products = await CatalogService.getAllProductos();
                products.forEach((p: any) => productMap.set(p.idProducto, p.descripcion || p.nombre));
            } catch (e) {
                console.warn("No se pudieron cargar los productos para mapeo");
            }

            // 2. Obtener los nombres de los clientes (solo los IDs únicos para no saturar la red)
            const uniqueClientIds = Array.from(new Set(sobrantesData.map((s: any) => s.idCliente)));
            const clientMap = new Map();

            await Promise.all(uniqueClientIds.map(async (id: any) => {
                try {
                    const client = await ClientService.getById(id);
                    clientMap.set(id, client.nombre);
                } catch (e) {
                    clientMap.set(id, `Cliente #${id}`);
                }
            }));

            // 3. Enriquecer los datos del JSON original con los nombres y fechas formateadas
            const enrichedData = sobrantesData.map((s: any) => ({
                ...s,
                nombreCliente: clientMap.get(s.idCliente) || `Cliente #${s.idCliente}`,
                nombreProducto: productMap.get(s.producto.idProducto) || `Producto #${s.producto.idProducto}`,
                fechaFormateada: new Date(s.fechaRegistro).toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })
            }));

            setSobrantes(enrichedData);
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el inventario de sobrantes' });
        } finally {
            setLoading(false);
        }
    };

    // --- MANEJO DEL CONSUMO ---
    const confirmConsume = (rowData: any) => {
        setConsumeData({
            idSobrante: rowData.idSobrante,
            maxAmount: rowData.cantidadDisponible,
            productName: rowData.nombreProducto
        });
        setShowConsumeDialog(true);
    };

    const processConsume = async (quantityToConsume: number) => {
        if (!consumeData) return;
        setIsConsuming(true);
        try {
            await SobranteService.consumirSobrante(consumeData.idSobrante, quantityToConsume);
            toast.current?.show({ severity: 'success', summary: 'Inventario actualizado', detail: `Se descontaron ${quantityToConsume} unidades.` });
            setShowConsumeDialog(false);
            loadData(); // Recargamos la tabla
        } catch (error: any) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo descontar el material.' });
        } finally {
            setIsConsuming(false);
        }
    };

    // --- FILTRADO ---
    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        // @ts-ignore
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    // --- RENDERIZADO DE COLUMNAS ---
    const header = (
        <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-2">
            <span className="p-input-icon-left w-full md:w-auto">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Buscar cliente o producto..." className="w-full md:w-auto" />
            </span>
            <Button icon="pi pi-refresh" rounded text onClick={loadData} tooltip="Recargar" />
        </div>
    );

    const renderCantidad = (rowData: any) => (
        <Tag
            value={`${rowData.cantidadDisponible} und.`}
            severity={rowData.cantidadDisponible > 10 ? 'success' : 'warning'}
            className="text-base px-3"
        />
    );

    const renderOrden = (rowData: any) => (
        <span className="font-bold text-blue-600">
            #{rowData.ordenOrigen?.idOrden}
        </span>
    );

    const actionBodyTemplate = (rowData: any) => (
        <div className="flex justify-content-center">
            <Button
                label="Consumir"
                icon="pi pi-minus-circle"
                size="small"
                severity="warning"
                outlined
                onClick={() => confirmConsume(rowData)}
                disabled={rowData.cantidadDisponible <= 0}
            />
        </div>
    );

    return (
        <div className="card shadow-2 border-round">
            <Toast ref={toast} />

            <div className="flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="m-0 text-2xl font-bold">Inventario de sobrantes</h2>
                    <p className="text-500 mt-1 mb-0">Material disponible de ordenes sobrantes de los clientes</p>
                </div>
            </div>

            <DataTable
                value={sobrantes}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                header={header}
                filters={filters}
                globalFilterFields={['nombreCliente', 'nombreProducto', 'ordenOrigen.idOrden']}
                emptyMessage="No se encontraron registros en el inventario."
                responsiveLayout="scroll"
                stripedRows
                loading={loading}
                dataKey="idSobrante"
                sortField="fechaRegistro"
                sortOrder={-1} // Ordena por fecha descendente por defecto
            >
                <Column field="idSobrante" header="ID" sortable style={{ width: '5rem' }} />
                <Column field="nombreCliente" header="Cliente" sortable style={{ minWidth: '12rem' }} />
                <Column field="nombreProducto" header="Producto" sortable style={{ minWidth: '12rem' }} />
                <Column field="ordenOrigen.idOrden" header="Orden de origen" body={renderOrden} sortable align="center" />
                <Column field="cantidadDisponible" header="Disponible" body={renderCantidad} sortable align="center" />
                <Column field="fechaFormateada" header="Fecha de ultimo registro" sortable />
                <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '8rem' }} />
            </DataTable>

            {/* Dialog para consumir cantidades */}
            <ConsumeLeftoverDialog
                visible={showConsumeDialog}
                onHide={() => setShowConsumeDialog(false)}
                onConfirm={processConsume}
                isConsuming={isConsuming}
                maxQuantity={consumeData?.maxAmount || 1}
                productName={consumeData?.productName || ''}
            />
        </div>
    );
};

export default ListSobrantesPage;