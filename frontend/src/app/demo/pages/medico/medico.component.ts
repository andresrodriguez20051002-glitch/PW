import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';
import { Medico } from 'src/app/models/medico';
import { MedicoService } from './service/medico.service';

@Component({
  selector: 'app-medico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // <-- Importante para los formularios
  templateUrl: './medico.component.html',
  styleUrl: './medico.component.scss'
})
export class MedicoComponent {
  // Variables para el modal.
  modalInstance: Modal | null = null;
  titleModal: string = "";
  modoFormulario: string = "";
  titleBoton: string = "";

  // Variables para la paginación y búsqueda
  listMedicos: Medico[] = [];
  terminoBusqueda = '';
  paginaActual = 1;
  readonly registrosPorPagina = 5;

  // Formulario y estado
  form!: FormGroup;
  medicoSelected: any = null;
  enviando = false;

  constructor(private readonly medicoService: MedicoService, private readonly fb: FormBuilder) {
    this.listar();
    this.inicializarFormulario();
  }

  inicializarFormulario() {
    this.form = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      tipoDocumento: ['', Validators.required],
      numeroDocumento: ['', Validators.required],
      registroProfesional: ['', Validators.required]
    });
  }

  get f(): any { return this.form.controls; }

  get medicoFiltrados(): Medico[] {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    if (!termino) return this.listMedicos;

    return this.listMedicos.filter((m) => {
      const valores = [
        m.nombres, m.apellidos, m.tipoDocumento, m.numeroDocumento, m.registroProfesional
      ];
      return valores.some((valor) => String(valor ?? '').toLowerCase().includes(termino));
    });
  }

  get medicoPaginados(): Medico[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    return this.medicoFiltrados.slice(inicio, inicio + this.registrosPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.medicoFiltrados.length / this.registrosPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, indice) => indice + 1);
  }

  listar() {
    this.medicoService.listar().subscribe({
      next: (data) => {
        this.listMedicos = data;
        this.paginaActual = 1;
      },
      error: (error) => console.error('Error al obtener los médicos:', error)
    });
  }

  actualizarBusqueda(event: Event) {
    this.terminoBusqueda = (event.target as HTMLInputElement).value;
    this.paginaActual = 1;
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  nuevoMedico(modo: string) {
    this.modoFormulario = modo;
    this.medicoSelected = null;
    this.form.reset();
    this.openModal(modo);
  }

  abrirEdicion(medico: any) {
    this.modoFormulario = 'E';
    this.medicoSelected = medico;
    this.form.patchValue({
      nombres: medico.nombres,
      apellidos: medico.apellidos,
      tipoDocumento: medico.tipoDocumento,
      numeroDocumento: medico.numeroDocumento,
      registroProfesional: medico.registroProfesional
    });
    this.openModal(this.modoFormulario);
  }

  openModal(modo: string) {
    this.titleModal = modo === 'C' ? 'Crear Médico' : 'Editar Médico';
    this.titleBoton = modo === 'C' ? 'Guardar Médico' : 'Actualizar Médico';
    const modalElement = document.getElementById('modalCrearMedico');
    if (modalElement) {
      this.modalInstance ??= new Modal(modalElement);
      this.modalInstance.show();
    }
  }

  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
    this.form.reset();
  }

  guardarMedico() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.value;
    const medico = {
      id: this.medicoSelected?.id, 
      nombres: valores.nombres,
      apellidos: valores.apellidos,
      tipoDocumento: valores.tipoDocumento,
      numeroDocumento: valores.numeroDocumento,
      registroProfesional: valores.registroProfesional
    };

    this.enviando = true;
    const peticion = this.modoFormulario === 'C' 
      ? this.medicoService.guardar(medico) 
      : this.medicoService.actualizar(medico);

    peticion.subscribe({
      next: (res) => {
        this.enviando = false;
        this.closeModal();
        this.listar();
        Swal.fire('Éxito', res.message || 'Médico guardado', 'success');
      },
      error: (err) => {
        this.enviando = false;
        Swal.fire('Error', err.error?.message || 'Error al guardar', 'error');
      }
    });
  }
}