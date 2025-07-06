import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { RolesController } from './roles/roles.controller';
import { RolesModule } from './roles/roles.module';
import { VentasController } from './ventas/ventas.controller';
import { VentasModule } from './ventas/ventas.module';
import { ProductosModule } from './productos/productos.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { DetsComprasController } from './dets_compras/dets_compras.controller';
import { DetsVentasModule } from './dets_ventas/dets_ventas.module';
import { ConfiguracionesModule } from './configuraciones/configuraciones.module';
import { AuthModule } from './auth/auth.module';
import { ComprasModule } from './compras/compras.module';
import { DetsComprasModule } from './dets_compras/dets_compras.module';
import { PdfService } from './pdf/pdf.service';
import { PdfController } from './pdf/pdf.controller';
import { PdfModule } from './pdf/pdf.module';
import { InventarioModule } from './inventario/inventario.module';
import { GastoModule } from './gastos/gastos.module';
import { CierreDiaModule } from './cierre_dia/cierre_dia.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TareasService } from './tareas/tareas.service';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { EmpresasModule } from './empresas/empresas.module';
import { RecetasModule } from './recetas/recetas.module';
import { DetsRecetasModule } from './dets_recetas/dets_recetas.module';
import { EquivalenciasModule } from './equivalencias/equivalencias.module';
import { TransformacionesModule } from './transformaciones/transformaciones.module';
import { LotesModule } from './lotes/lotes.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
    UsuariosModule,
    CategoriasModule,
    RolesModule,
    ProductosModule,
    ProveedoresModule,
    DetsComprasModule,
    DetsVentasModule,
    ConfiguracionesModule,
    VentasModule,
    AuthModule,
    ComprasModule,
    PdfModule,
    InventarioModule,
    GastoModule,
    CierreDiaModule,
    EmpresasModule,
    ScheduleModule.forRoot(),
    RecetasModule,
    DetsRecetasModule,
    EquivalenciasModule,
    TransformacionesModule,
    LotesModule,
    MailModule,
  ],
  controllers: [
    AppController,
    RolesController,
    VentasController,
    DetsComprasController,
    PdfController,
    DashboardController,
  ],
  providers: [AppService, PdfService, TareasService, DashboardService],
})
export class AppModule {}
