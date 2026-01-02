/**
 * PDF Utilities - Unified PDF generation from HTML views
 * Ensures PDF downloads match PDF views exactly
 */

/**
 * Check if a value contains unsupported color formats
 * html2canvas doesn't support oklch, oklab, lch, lab, hwb
 */
function hasUnsupportedColorFunction(value: string): boolean {
    const unsupportedFunctions = ['oklch', 'oklab', 'lch(', 'lab(', 'hwb(', 'color('];
    return unsupportedFunctions.some(fn => value.includes(fn));
}

/**
 * Convert or filter out unsupported color formats
 * Returns null if the value should be skipped entirely
 */
function safeColorValue(value: string, propName: string): string | null {
    // If it contains unsupported color functions, skip this property
    if (hasUnsupportedColorFunction(value)) {
        // For critical properties, try to provide a fallback
        if (propName === 'color') return 'rgb(0, 0, 0)'; // black text
        if (propName === 'background-color') return 'rgb(255, 255, 255)'; // white background
        if (propName.includes('border-color')) return 'rgb(0, 0, 0)'; // black border
        // For other properties, skip them
        return null;
    }
    return value;
}

/**
 * Deeply copy all computed styles to inline styles
 */
function copyComputedStylesToInline(element: HTMLElement, sourceElement: HTMLElement) {
    const computed = window.getComputedStyle(sourceElement);

    // Copy ALL computed style properties
    for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        let value = computed.getPropertyValue(prop);

        if (value) {
            // Filter out or convert unsupported color formats
            const safeValue = safeColorValue(value, prop);
            if (safeValue) {
                element.style.setProperty(prop, safeValue, 'important');
            }
            // If safeValue is null, skip this property entirely
        }
    }
}

/**
 * Create a clean clone with only inline styles, no classes or external CSS
 */
function createStyledClone(element: HTMLElement): HTMLElement {
    const clone = element.cloneNode(false) as HTMLElement;

    // Copy all computed styles to inline
    copyComputedStylesToInline(clone, element);

    // Remove class and id to prevent CSS matching
    clone.removeAttribute('class');
    clone.removeAttribute('id');

    // Recursively clone children
    Array.from(element.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const childClone = createStyledClone(child as HTMLElement);
            clone.appendChild(childClone);
        } else if (child.nodeType === Node.TEXT_NODE) {
            clone.appendChild(child.cloneNode(true));
        }
    });

    return clone;
}

export async function generatePDFFromElement(
    elementId: string,
    filename: string
): Promise<void> {
    let originalDisplay = '';
    let originalVisibility = '';
    let originalOpacity = '';
    let element: HTMLElement | null = null;

    try {
        // Dynamically import libraries
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        // Get the element to convert
        element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with id "${elementId}" not found`);
        }

        // Check if element has content
        if (!element.innerHTML.trim()) {
            throw new Error(`Element with id "${elementId}" has no content to generate PDF`);
        }

        // Store original styles and ensure element is visible for capturing
        originalDisplay = element.style.display;
        originalVisibility = element.style.visibility;
        originalOpacity = element.style.opacity;

        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.opacity = '1';

        // Wait for any dynamic content to render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Clone the element to avoid modifying the original
        const clonedElement = element.cloneNode(true) as HTMLElement;
        clonedElement.style.position = 'absolute';
        clonedElement.style.left = '-9999px';
        clonedElement.style.top = '0';
        clonedElement.style.width = '210mm';
        clonedElement.style.backgroundColor = '#ffffff';
        clonedElement.style.display = 'block';
        clonedElement.style.visibility = 'visible';
        clonedElement.style.opacity = '1';
        document.body.appendChild(clonedElement);

        // Get all elements in both original and clone to preserve styles
        const originalElements = [element, ...Array.from(element.querySelectorAll('*'))];
        const clonedElements = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))];

        // Copy all styles from original to clone, preserving inline styles
        originalElements.forEach((originalEl, index) => {
            if (originalEl instanceof HTMLElement && clonedElements[index] instanceof HTMLElement) {
                const clonedEl = clonedElements[index] as HTMLElement;
                const computed = window.getComputedStyle(originalEl);

                // Get original inline style attribute to preserve !important declarations
                const originalInlineStyle = originalEl.getAttribute('style') || '';

                // Copy all computed styles first
                const colorProps = ['color', 'background-color', 'background-image', 'border-color',
                    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'];

                colorProps.forEach((prop) => {
                    const value = computed.getPropertyValue(prop);
                    if (value && hasUnsupportedColorFunction(value)) {
                        // Set safe fallback colors
                        if (prop === 'color') {
                            clonedEl.style.setProperty(prop, 'rgb(0, 0, 0)', 'important');
                        } else if (prop === 'background-image') {
                            clonedEl.style.setProperty(prop, 'none', 'important');
                            clonedEl.style.setProperty('background-color', 'rgb(255, 255, 255)', 'important');
                        } else if (prop.includes('background')) {
                            clonedEl.style.setProperty(prop, 'rgb(255, 255, 255)', 'important');
                        } else if (prop.includes('border')) {
                            clonedEl.style.setProperty(prop, 'rgb(226, 232, 240)', 'important');
                        }
                    } else if (value) {
                        // Copy the computed value
                        clonedEl.style.setProperty(prop, value);
                    }
                });

                // Re-apply original inline styles to preserve !important and specific colors
                if (originalInlineStyle) {
                    const styles = originalInlineStyle.split(';').filter(s => s.trim());
                    styles.forEach(style => {
                        const colonIndex = style.indexOf(':');
                        if (colonIndex > 0) {
                            const prop = style.substring(0, colonIndex).trim();
                            const val = style.substring(colonIndex + 1).trim();
                            const hasImportant = val.includes('!important');
                            const cleanVal = val.replace('!important', '').trim();

                            // Apply with or without !important as in original
                            if (hasImportant) {
                                clonedEl.style.setProperty(prop, cleanVal, 'important');
                            } else {
                                clonedEl.style.setProperty(prop, cleanVal);
                            }
                        }
                    });
                }
            }
        });

        // Calculate A4 dimensions in pixels (at 96 DPI: 210mm = 794px, 297mm = 1123px)
        const a4WidthPx = 794;
        const a4HeightPx = 1123;

        // Create a high-quality canvas with proper A4 proportions
        const scale = 3; // Higher scale for better quality
        const canvas = await html2canvas(clonedElement, {
            scale: scale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: a4WidthPx,
            height: Math.max(a4HeightPx, clonedElement.scrollHeight),
            windowWidth: a4WidthPx,
            windowHeight: Math.max(a4HeightPx, clonedElement.scrollHeight),
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            allowTaint: true,
            foreignObjectRendering: false,
            imageTimeout: 0,
            removeContainer: false,
        });

        // Remove the cloned element
        document.body.removeChild(clonedElement);

        // Calculate PDF dimensions - use A4 standard
        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = 297; // A4 height in mm

        // Calculate the height ratio
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // Create PDF with A4 dimensions
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true,
        });

        // Convert canvas to high-quality image
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // Check if content fits on one page
        if (imgHeight <= pdfHeight) {
            // Single page - center vertically if needed
            const yOffset = 0; // Start from top
            pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, imgHeight, '', 'FAST');
        } else {
            // Multiple pages needed
            let heightLeft = imgHeight;
            let position = 0;
            let page = 0;

            while (heightLeft > 0) {
                if (page > 0) {
                    pdf.addPage();
                }

                // Calculate the portion of the image to show on this page
                const sourceY = page * pdfHeight * (canvas.height / imgHeight);
                const sourceHeight = Math.min(pdfHeight * (canvas.height / imgHeight), canvas.height - sourceY);

                // Create a temporary canvas for this page
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sourceHeight;

                const ctx = pageCanvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                    ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

                    const pageImgData = pageCanvas.toDataURL('image/jpeg', 1.0);
                    const pageImgHeight = (sourceHeight * pdfWidth) / canvas.width;
                    pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight, '', 'FAST');
                }

                heightLeft -= pdfHeight;
                page++;
            }
        }

        // Save the PDF
        pdf.save(filename);

        // Restore original element styles
        if (element) {
            element.style.display = originalDisplay;
            element.style.visibility = originalVisibility;
            element.style.opacity = originalOpacity;
        }
    } catch (error) {
        // Restore original element styles even if there's an error
        if (element) {
            element.style.display = originalDisplay || '';
            element.style.visibility = originalVisibility || '';
            element.style.opacity = originalOpacity || '';
        }
        console.error('PDF generation error:', error);
        throw error;
    }
}

/**
 * Print the PDF view directly using browser print dialog
 */
export async function printPDFView(elementId: string, title: string): Promise<void> {
    const printContent = document.getElementById(elementId);
    if (!printContent) {
        console.error(`Element with id "${elementId}" not found`);
        throw new Error(`Print element not found: ${elementId}`);
    }

    // Check if element has content
    if (!printContent.innerHTML.trim()) {
        console.error(`Element with id "${elementId}" has no content`);
        throw new Error(`Print element is empty: ${elementId}`);
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        console.error('Failed to open print window - popup blocked?');
        throw new Error('Failed to open print window. Please allow popups for this site.');
    }

    // Get all computed styles and create inline styles
    const allElements = [printContent, ...Array.from(printContent.querySelectorAll('*'))];
    const styleMap = new Map<Element, string>();

    allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
            let inlineStyle = '';

            const computed = window.getComputedStyle(el);

            // Essential styles for layout and appearance
            const importantProps = [
                'display', 'position', 'width', 'height', 'margin', 'padding',
                'font-family', 'font-size', 'font-weight', 'color', 'background-color',
                'border', 'border-width', 'border-style', 'border-color',
                'text-align', 'line-height', 'vertical-align'
            ];

            importantProps.forEach(prop => {
                const value = computed.getPropertyValue(prop);
                if (value && value !== 'none' && value !== 'auto') {
                    const safeValue = safeColorValue(value, prop);
                    if (safeValue) {
                        inlineStyle += `${prop}: ${safeValue}; `;
                    }
                }
            });

            // Copy all other computed styles
            for (let i = 0; i < computed.length; i++) {
                const prop = computed[i];
                if (!importantProps.includes(prop)) {
                    let value = computed.getPropertyValue(prop);
                    if (value && value !== 'none' && value !== 'auto') {
                        const safeValue = safeColorValue(value, prop);
                        if (safeValue) {
                            inlineStyle += `${prop}: ${safeValue}; `;
                        }
                    }
                }
            }

            styleMap.set(el, inlineStyle);
        }
    });

    // Clone and apply inline styles
    const clone = printContent.cloneNode(true) as HTMLElement;
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll('*'))];

    cloneElements.forEach((el, index) => {
        if (el instanceof HTMLElement && index < allElements.length) {
            const originalEl = allElements[index];
            const inlineStyle = styleMap.get(originalEl);
            if (inlineStyle) {
                el.setAttribute('style', inlineStyle);
            }
            el.removeAttribute('class');
        }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #000;
            background: #fff;
            line-height: 1.4;
          }
          @media print { 
            body { 
              margin: 0;
              padding: 0;
            }
            @page {
              margin: 10mm;
              size: A4;
            }
          }
          table {
            border-collapse: collapse;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content and images to load then trigger print
    printWindow.onload = () => {
        // Additional wait for any images or dynamic content
        setTimeout(() => {
            try {
                printWindow.print();
            } catch (printError) {
                console.error('Print dialog error:', printError);
                // Fallback: try to focus and print again
                printWindow.focus();
                setTimeout(() => printWindow.print(), 100);
            }
        }, 500);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
        if (printWindow.document.readyState === 'complete') {
            printWindow.print();
        }
    }, 1000);
}
