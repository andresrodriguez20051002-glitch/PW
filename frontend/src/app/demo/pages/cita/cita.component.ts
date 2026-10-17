import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';
import { CitaService } from './service/cita.service';

@Component({
  selector: 'app-cita',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cita.component.html',
  styleUrl: './cita.component.scss'
})
export class CitaComponent implements OnInit {
  listCitas: any[] = [];
  listClientes: any[] = [];
  listMascotas: any[] = [];
  listMedicos: any[] = [];
  
  // Variables para paginación y búsqueda
  terminoBusqueda = '';
  paginaActual = 1;
  readonly registrosPorPagina = 5;

  form!: FormGroup;
  citaSelected: any = null;
  modoFormulario = 'C';
  titleModal = '';
  titleBoton = '';
  modalInstance: Modal | null = null;
  enviando = false;

  constructor(private citaService: CitaService, private fb: FormBuilder) {}

  ngOnInit() {
    this.listar();
    this.inicializarFormulario();
    this.cargarCombos();
  }

  // ESTO ES LO QUE FALTABA: Para que el HTML pueda validar
  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }

  inicializarFormulario() {
    this.form = this.fb.group({
      cliente: [null, Validators.required],
      mascota: [{ value: null, disabled: true }, Validators.required], 
      medico: [null, Validators.required],
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      motivo: ['', Validators.required]
    });

    // Escuchar cuando cambie el cliente para cargar sus mascotas
    this.form.get('cliente')?.valueChanges.subscribe(cliente => {
      if (cliente) {
        this.cargarMascotasPorCliente(cliente.id); 
        this.form.get('mascota')?.enable(); 
      } else {
        this.listMascotas = [];
        this.form.get('mascota')?.disable();
      }
    });
  }

  cargarCombos() {
    this.citaService.listarClientes().subscribe(res => this.listClientes = res);
    this.citaService.listarMedicos().subscribe(res => this.listMedicos = res);
  }

  cargarMascotasPorCliente(clienteId: number) {
    this.citaService.listarMascotasPorCliente(clienteId).subscribe(res => {
      this.listMascotas = res;
      this.form.get('mascota')?.setValue(null);
    });
  }

  listar() {
    this.citaService.listarCitas().subscribe(res => this.listCitas = res);
  }

  // --- LÓGICA DE LA TABLA ---
  get citasFiltradas() {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    if (!termino) return this.listCitas;
    
    return this.listCitas.filter(c => 
      c.motivo?.toLowerCase().includes(termino) || 
      c.mascota?.nombreMascota?.toLowerCase().includes(termino) ||
      c.cliente?.nombres?.toLowerCase().includes(termino)
    );
  }

  get citasPaginadas() {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    return this.citasFiltradas.slice(inicio, inicio + this.registrosPorPagina);
  }

  get totalPaginas() {
    return Math.ceil(this.citasFiltradas.length / this.registrosPorPagina);
  }

  get paginas() {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
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
  // ---------------------------

  nuevaCita() {
    this.titleModal = 'Crear Cita';
    this.titleBoton = 'Guardar';
    this.modoFormulario = 'C';
    this.citaSelected = null;
    this.form.reset();
    this.form.get('mascota')?.disable();
    this.openModal();
  }

  abrirEdicion(cita: any) {
    this.citaSelected = cita;
    this.modoFormulario = 'E';
    this.titleModal = 'Editar Cita';
    this.titleBoton = 'Actualizar';
    
    const fechaHora = new Date(cita.fechaHora);
    const fecha = fechaHora.toISOString().split('T')[0];
    const hora = fechaHora.toTimeString().slice(0, 5);

    if (cita.cliente) {
       this.cargarMascotasPorCliente(cita.cliente.id);
    }

    this.form.patchValue({
      cliente: cita.cliente || null,
      mascota: cita.mascota || null,
      medico: cita.medico || null,
      fecha: fecha,
      hora: hora,
      motivo: cita.motivo
    });
    this.form.get('mascota')?.enable();
    this.openModal();
  }

  openModal() {
    const modalElement = document.getElementById('modalCita');
    if (modalElement) {
      this.modalInstance ??= new Modal(modalElement);
      this.modalInstance.show();
    }
  }

  closeModal() {
    this.modalInstance?.hide();
    this.form.reset();
  }

  guardarCita() {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const fechaHoraString = `${valores.fecha}T${valores.hora}:00`; 

    const cita = {
      id: this.citaSelected?.id,
      mascotaId: valores.mascota.mascotaId,
      medicoId: valores.medico.id,
      fechaHora: fechaHoraString,
      motivo: valores.motivo,
      estado: 'PROGRAMADA'
    };

    this.enviando = true;
    const peticion = this.modoFormulario === 'C' 
      ? this.citaService.crearCita(cita) 
      : this.citaService.actualizarCita(cita);

    peticion.subscribe({
      next: (res) => {
        this.enviando = false;
        this.closeModal();
        this.listar();
        Swal.fire('Éxito', res.message || 'Cita guardada', 'success');
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