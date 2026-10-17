import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';
import { HistoriaService } from './service/historia.service';

@Component({
  selector: 'app-historia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
  templateUrl: './historia.component.html',
  styleUrl: './historia.component.scss'
})
export class HistoriaComponent implements OnInit {
  listAnotaciones: any[] = [];
  listMascotas: any[] = [];
  listMedicos: any[] = [];
  form!: FormGroup;
  modalInstance: Modal | null = null;
  enviando = false;

  constructor(private historiaService: HistoriaService, private fb: FormBuilder) {}

  ngOnInit() {
    this.listar();
    this.inicializarFormulario();
    this.cargarCombos();
  }

  inicializarFormulario() {
    this.form = this.fb.group({
      mascota: [null, Validators.required],
      medico: [null, Validators.required],
      descripcion: ['', Validators.required]
    });
  }

  cargarCombos() {
    this.historiaService.listarMascotas().subscribe(res => this.listMascotas = res);
    this.historiaService.listarMedicos().subscribe(res => this.listMedicos = res);
  }

  listar() {
    this.historiaService.listarAnotaciones().subscribe(res => {
      // Ordenamos para que salgan las más recientes primero
      this.listAnotaciones = res.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    });
  }

  abrirModal() {
    this.form.reset();
    const modalElement = document.getElementById('modalHistoria');
    if (modalElement) {
      this.modalInstance ??= new Modal(modalElement);
      this.modalInstance.show();
    }
  }

  closeModal() {
    this.modalInstance?.hide();
  }

  guardarAnotacion() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.value;
    const anotacion = {
      mascotaId: valores.mascota.mascotaId,
      medicoId: valores.medico.id,
      descripcion: valores.descripcion
    };

    this.enviando = true;
    this.historiaService.crearAnotacion(anotacion).subscribe({
      next: (res) => {
        this.enviando = false;
        this.closeModal();
        this.listar();
        Swal.fire('Éxito', res.message || 'Anotación creada', 'success');
      },
      error: (err) => {
        this.enviando = false;
        Swal.fire('Error', err.error?.message || 'Error al guardar', 'error');
      }
    });
  }

  compararObjetos(o1: any, o2: any): boolean {
    return o1 && o2 ? (o1.id === o2.id || o1.mascotaId === o2.mascotaId) : o1 === o2;
  }
}