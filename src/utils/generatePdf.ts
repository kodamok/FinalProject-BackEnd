import fs from 'fs';
import htmlPdf from 'html-pdf';

export async function generatePdf(typeOfFile: 'png' | 'jpeg' | 'pdf' | undefined, filePath: string, fileName: string, toBeGenFileName: string) {
  try {
    const htmlFilePath = `src/files/${filePath}${fileName}`;

    //    checking file Existency
    if (!fs.existsSync(htmlFilePath)) {
      console.log('File does not exist');
    }
    // typeOfFile === 'PNG' ? (toBeGenFileName += '.png') : (toBeGenFileName += '.pdf');

    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const htmlToPdfOptions = {
      type: typeOfFile,
      height: '650px',
      width: '850px',
      renderDelay: 2000,
    };

    return new Promise((resolve) => {
      htmlPdf.create(htmlContent, htmlToPdfOptions).toFile(toBeGenFileName, function (err: any, result: any) {
        if (err) return console.log(err);
        resolve(result);
      });
    });
  } catch (e) {
    console.log('error during converting html to pdf', e);
  }
}

// generatePdf('PDF', '/', 'certificate.html', 'cert_sample');
