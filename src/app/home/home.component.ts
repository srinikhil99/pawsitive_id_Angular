import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

declare const showPreview: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  constructor(private http: HttpClient) {}

  @ViewChild('uploadBtn') uploadBtn!: ElementRef<HTMLInputElement>;
  fileChosen: string = 'No file chosen';
  responseBreed: string = '';

  ngOnInit() {
    // localStorage.clear(); // Clear local storage on page refresh
    this.fetchImageFromStorage();
    this.fetchResult();
  }

  onchange() {
    showPreview();
  }

  onFileChange(event: any): void {
    const fileList: FileList | null = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      this.getBase64(file).then((base64Data: string) => {
        localStorage.setItem('selectedImage', base64Data);
        localStorage.setItem('selectedImageName', file.name); // Store the file name separately
        this.fileChosen = file.name;
        this.onPhotoUploaded(file);
      });
    } else {
      this.fileChosen = 'No file chosen';
      localStorage.removeItem('selectedImage');
      localStorage.removeItem('selectedImageName'); // Remove the stored file name
      localStorage.removeItem('predictedBreed');
    }
  }

  fetchImageFromStorage() {
    const selectedImageName = localStorage.getItem('selectedImageName');
    if (selectedImageName) {
      this.fileChosen = selectedImageName;
      const selectedImage = localStorage.getItem('selectedImage');
      if (selectedImage) {
        const previewImg = document.getElementById(
          'upload__file__bg'
        ) as HTMLImageElement;
        previewImg.src = selectedImage;
      }
    }
  }

  getBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  async onPhotoUploaded(file: File) {
    const headerBytes = await this.readFileHeader(file);
    const detectedFormat = this.detectImageFormat(headerBytes);

    if (!detectedFormat || !['jpg', 'png'].includes(detectedFormat)) {
      this.setDefaultImage();
      localStorage.removeItem('selectedImageName');

      const customPopup = document.getElementById(
        'custom-popup'
      ) as HTMLElement;
      customPopup.style.display = 'flex';

      const closeButton = document.getElementById('close-popup') as HTMLElement;
      closeButton.onclick = function () {
        customPopup.style.display = 'none';
      };

      this.fileChosen = 'No file chosen';
      return;
    } else {
      const formData = new FormData();
      formData.append('image', file);
      this.responseBreed = 'Fetching Results...';

      this.http
        .post(
          'https://pawsitive-id-backend-2-k6kwv3hqka-uc.a.run.app',
          formData
        )
        .pipe(
          catchError((error) => {
            console.log(error.message);
            this.responseBreed = 'An error has occurred, refresh the page or try again later'
            return throwError(error);
          })
        )
        .subscribe((response: any) => {
          // Handle response here
          this.responseBreed = response.predicted_class;
          localStorage.setItem('predictedBreed', this.responseBreed);
        });
    }
  }

  async readFileHeader(file: File): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          const buffer = new Uint8Array(reader.result);
          resolve(buffer);
        } else {
          reject(new Error('Failed to read file header.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file.slice(0, 8)); // Read the first 8 bytes
    });
  }

  detectImageFormat(headerBytes: Uint8Array): string | undefined {
    if (headerBytes.length >= 2) {
      if (headerBytes[0] === 0xFF && headerBytes[1] === 0xD8) {
        return 'jpg';
      } else if (
        headerBytes[0] === 0x89 &&
        headerBytes[1] === 0x50 &&
        headerBytes[2] === 0x4E &&
        headerBytes[3] === 0x47 &&
        headerBytes[4] === 0x0D &&
        headerBytes[5] === 0x0A &&
        headerBytes[6] === 0x1A &&
        headerBytes[7] === 0x0A
      ) {
        return 'png';
      }
    }
    return undefined;
  }

  setDefaultImage() {
    // alert("Please upload an image file in .png or .jpg format.");
    const customPopup = document.getElementById('custom-popup') as HTMLElement;
    customPopup.style.display = 'none';
    const previewImg = document.getElementById(
      'file-ip-1-preview'
    ) as HTMLImageElement;
    previewImg.src = '../../assets/images/logo/home_page.png';
  }

  fetchResult() {
    const result = localStorage.getItem('predictedBreed');
    if (result) {
      this.responseBreed = result;
    }
  }
}

localStorage.clear();
