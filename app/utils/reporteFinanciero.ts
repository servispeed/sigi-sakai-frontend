import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TotalesCajaPDF {
    balance: number;
    entradaCaja: number;
    totalIngresos: number;
    totalEgresos: number;
}

export interface MovimientoPDF {
    fecha: string;
    concepto: string;
    tipoMovimiento: string;
    monto: number;
}

const fetchImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('No se pudo encontrar la imagen del membrete en la carpeta public');
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const formatCurrency = (value: number) => {
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export const generarReporteFinancieroPDF = async (
    totalesCaja: TotalesCajaPDF,
    movements: MovimientoPDF[],
    labelFiltro: string
): Promise<void> => {

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const imgData = await fetchImageAsBase64('/membrete.jpeg');

    const drawBackground = () => {
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    };

    drawBackground();

    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = (...args: any[]) => {
        originalAddPage(...args);
        drawBackground();
        return doc;
    };

    let currentY = 68;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('Reporte', 14, currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(`Período del reporte: ${labelFiltro}`, 14, currentY);
    currentY += 5;
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, currentY);

    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text('Resumen de caja', 14, currentY);
    currentY += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Balance actual: ${formatCurrency(totalesCaja.balance)}`, 14, currentY);
    currentY += 5;
    doc.text(`Fondo base / Entradas: ${formatCurrency(totalesCaja.entradaCaja)}`, 14, currentY);
    currentY += 5;
    doc.text(`Total ingresos: ${formatCurrency(totalesCaja.totalIngresos)}`, 14, currentY);
    currentY += 5;
    doc.text(`Total egresos: ${formatCurrency(totalesCaja.totalEgresos)}`, 14, currentY);

    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text('Detalle de movimientos', 14, currentY);
    currentY += 5;

    const tableColumn = ["Fecha", "Concepto", "Tipo", "Monto"];
    const tableRows = movements.map(m => {
        const fechaStr = formatDate(m.fecha);
        const isIngreso = (m.tipoMovimiento || '').toUpperCase().includes('INGRESO');
        const signo = isIngreso ? '+' : '-';
        const montoStr = `${signo} ${formatCurrency(Math.abs(m.monto))}`;

        return [fechaStr, m.concepto, m.tipoMovimiento, montoStr];
    });

    autoTable(doc, {
        startY: currentY,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: [18, 59, 112],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [40, 40, 40],
            cellPadding: 2.5
        },
        didParseCell: function (data) {
            if (data.section === 'body') {
                data.cell.styles.fillColor =
                    data.row.index % 2 === 0
                        ? [255, 255, 255]
                        : [235, 243, 250];
            }
        },
        margin: {
            top: 78,
            bottom: 45,
            left: 14,
            right: 14
        },
        showHead: 'everyPage',
        rowPageBreak: 'avoid'
    });

    const fechaLegible = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
    doc.save(`Reporte_Financiero_${labelFiltro}_${fechaLegible}.pdf`);
};