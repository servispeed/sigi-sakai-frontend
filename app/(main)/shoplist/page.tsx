'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { FilterMatchMode } from 'primereact/api';
import { Tag } from 'primereact/tag';

import { comprasService } from '@/app/service/shopService';
import { CatalogService } from '@/app/service/catalogService';

const ListSolicitudesPendientesPage = () => {
    const router = useRouter();
    const toast = useRef<Toast>(null);

    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const pendientesData = await comprasService.getPendientes();
            let productMap = new Map();
            try {
                const products = await CatalogService.getProductos();
                products.forEach((p: any) => {
                    const key = p.idProducto || p.id;
                    if (key) productMap.set(key, p.descripcion || p.nombre);
                });
            } catch (e) {
                console.warn("No se pudieron cargar los productos para el mapeo");
            }

            const enrichedData = pendientesData.map((s: any) => {
                const resumenInsumos = s.detalles && s.detalles.length > 0
                    ? s.detalles.map((d: any) => {
                        if (!d.idProducto) return `${d.cantidad}x Insumo Genérico`;
                        const prodName = productMap.get(d.idProducto) || `Producto #${d.idProducto}`;
                        return `${d.cantidad}x ${prodName}`;
                    }).join(', ')
                    : 'Sin insumos especificados';

                return {
                    ...s,
                    resumenInsumos,
                    fechaFormateada: new Date(s.fechaCreacion).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }),
                    ordenTexto: s.idOrden ? `Orden #${s.idOrden}` : 'Sin Orden'
                };
            });

            setSolicitudes(enrichedData);
        } catch (err) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar las solicitudes pendientes.'
            });
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        // @ts-ignore
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const goToProcesarCompra = (idOrden: number) => {
        router.push(`/receipt?id=${idOrden}`);
    };

    const header = (
        <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-2">
            <span className="p-input-icon-left w-full md:w-auto">
                <i className="pi pi-search" />
                <InputText
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Buscar descripción o insumo..."
                    className="w-full md:w-auto"
                />
            </span>
            <Button
                icon="pi pi-refresh"
                rounded
                text
                onClick={loadData}
                tooltip="Recargar"
            />
        </div>
    );

    const renderOrden = (rowData: any) => (
        rowData.idOrden ? (
            <span className="font-bold text-blue-600">
                #{rowData.idOrden}
            </span>
        ) : (
            <span className="text-500">N/A</span>
        )
    );

    const renderEstatus = (rowData: any) => {
        switch (rowData.idEstatus) {
            case 1:
                return <Tag value="PENDIENTE" severity="warning" />;
            case 3:
                return <Tag value="ATRASADA" severity="danger" />;
            default:
                return <Tag value="DESCONOCIDO" severity="info" />;
        }
    };

const actionBodyTemplate = (rowData: any) => (
        <div className="flex justify-content-center">
            <Button
                label={rowData.idEstatus === 3 ? "Llegada atrasada" : "Comprar"}
                icon={rowData.idEstatus === 3 ? "pi pi-box" : "pi pi-shopping-cart"}
                size="small"
                severity={rowData.idEstatus === 3 ? "danger" : undefined}
                outlined
                onClick={() => goToProcesarCompra(rowData.idOrden)}
                disabled={!rowData.idOrden}
                tooltip={!rowData.idOrden ? "No tiene orden asociada" : "Comprar insumos"}
            />
        </div>
    );

    return (
        <div className="card shadow-2 border-round">
            <Toast ref={toast} />

            <div className="flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="m-0">Solicitudes de insumos pendientes de compra</h2>
                    <p className="text-gray-500 text-sm">Atiende las solicitudes a la brevedad. Recuerda que los materiales son requeridos para producción</p>
                </div>
            </div>

            <DataTable
                value={solicitudes}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                header={header}
                filters={filters}
                globalFilterFields={['descripcionSolicitud', 'resumenInsumos', 'ordenTexto']}
                emptyMessage="No hay solicitudes de insumos pendientes."
                responsiveLayout="scroll"
                stripedRows
                loading={loading}
                dataKey="idSolicitud"
                sortField="fechaCreacion"
                sortOrder={-1}
            >
                <Column field="ordenTexto" header="Orden" body={renderOrden} sortable align="center" style={{ width: '6rem' }} />
                <Column field="fechaFormateada" header="Fecha de solicitud" sortable style={{ width: '12rem' }} />
                <Column field="descripcionSolicitud" header="Notas" style={{ minWidth: '14rem' }}
                    body={(r) => r.descripcionSolicitud || <span className="text-400 font-italic">Sin notas</span>} />
                <Column field="resumenInsumos" header="Insumos requeridos" style={{ minWidth: '18rem' }} />
                <Column field="idEstatus" header="Estado" body={renderEstatus} align="center" style={{ width: '8rem' }} />
                <Column body={actionBodyTemplate} exportable={false} style={{ width: '10rem' }} align="center" />
            </DataTable>
        </div>
    );
};

export default ListSolicitudesPendientesPage;