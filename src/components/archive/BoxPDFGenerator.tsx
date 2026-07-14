import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export interface ContenedorPDFData {
  codigo_contenedor: string;
  cajas_logicas: {
    codigo_etiqueta: string;
    localidad: string;
  }[];
}

export const generateBoxPDF = async (contenedores: ContenedorPDFData[]) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let labelCount = 0;

    for (let i = 0; i < contenedores.length; i++) {
      const contenedor = contenedores[i];
      
      // If we already placed 2 labels on the page, create a new page
      if (labelCount === 2) {
        doc.addPage();
        labelCount = 0;
      }

      // Calculate Y offset based on whether it's the top label or bottom label
      // A4 height is 297mm. Half is 148.5mm.
      const yOffset = labelCount === 0 ? 0 : 148.5;
      
      // --- HEADER ---
      doc.setFillColor(0, 70, 140); // #00468c
      doc.rect(10, yOffset + 6, 190, 18, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('FIMAGADI • ARCHIVO CENTRAL', 105, yOffset + 14, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('ETIQUETA DE CONTROL DE CONTENEDOR FÍSICO', 105, yOffset + 20, { align: 'center' });

      // --- BODY ---
      // Left side: Container Code
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTENEDOR PRINCIPAL:', 20, yOffset + 35);

      doc.setFontSize(38);
      doc.text(contenedor.codigo_contenedor || 'SIN-ASIGNAR', 20, yOffset + 50);

      // Right side: QR Code
      const webhookUrl = `https://n8n-n8n.mv7mvl.easypanel.host/webhook/caja-info?caja=${contenedor.codigo_contenedor}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(webhookUrl)}`;
      
      try {
        // Fetch QR image as base64
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        // Add QR image to PDF
        doc.addImage(base64, 'PNG', 145, yOffset + 30, 45, 45);
      } catch (e) {
        console.error('Failed to load QR code', e);
        doc.setFontSize(10);
        doc.text('[Error al cargar QR]', 155, yOffset + 45);
      }

      // QR Instruction Text
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Escanee con un celular para ver el', 167.5, yOffset + 78, { align: 'center' });
      doc.text('inventario digital en tiempo real', 167.5, yOffset + 81, { align: 'center' });

      // --- FOOTER TABLE ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTENIDO LÓGICO VINCULADO', 105, yOffset + 70, { align: 'center' });

      const sortedBoxes = [...contenedor.cajas_logicas].sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
      const visibleBoxes = sortedBoxes.slice(0, 10);
      const hasMore = sortedBoxes.length > 10;
      
      const tableData = visibleBoxes.length > 0
          ? visibleBoxes.map(cl => [cl.codigo_etiqueta, cl.localidad])
          : [['(Contenedor vacío)', '-']];
          
      if (hasMore) {
        tableData.push([`... y ${contenedor.cajas_logicas.length - 10} cajas más`, '']);
      }

      autoTable(doc, {
        startY: yOffset + 74,
        margin: { left: 15, right: 15 },
        head: [['Código de Caja Lógica', 'Localidad / Proyecto']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [0, 70, 140], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center' },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      // Draw a subtle dashed cut line if it's the top label
      if (labelCount === 0) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([3, 3], 0);
        doc.line(0, 148.5, 210, 148.5);
        doc.setLineDashPattern([], 0); // reset
      }

      labelCount++;
    }

    doc.save(`Etiquetas_Archivo_${new Date().getTime()}.pdf`);
    toast.success('PDF generado exitosamente');
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Ocurrió un error al generar las etiquetas PDF');
  }
};
