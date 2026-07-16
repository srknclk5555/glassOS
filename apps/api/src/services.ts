import {
  db,
  CustomerRepository,
  OrderRepository,
  OrderLineRepository,
  ProductionRepository,
  ProductionQueueRepository,
  ReworkRepository,
  CustomerService,
  OrderService,
  ProductionService,
  ProductionQueueService,
  ReworkService,
  CuttingExecutionService,
  ProductionTransferService,
  StationOperationService,
  QualityControlService,
  DispatchService,
  LocalEventPublisher,
} from "@repo/db";

export interface AppServices {
  customer: CustomerService;
  order: OrderService;
  production: ProductionService;
  queue: ProductionQueueService;
  transfer: ProductionTransferService;
  quality: QualityControlService;
  dispatch: DispatchService;
  rework: ReworkService;
  cutting: CuttingExecutionService;
  station: StationOperationService;
}

export function createAppServices(): AppServices {
  // Repositories
  const customerRepository = new CustomerRepository(db as never);
  const orderRepository = new OrderRepository(db as never);
  const orderLineRepository = new OrderLineRepository(db as never);
  const productionRepository = new ProductionRepository(db as never);
  const productionQueueRepository = new ProductionQueueRepository(db as never);
  const reworkRepository = new ReworkRepository(db as never);

  // Singleton EventPublisher — ONE instance for the entire application
  const eventPublisher = new LocalEventPublisher();

  // Services
  const customer = new CustomerService(customerRepository, eventPublisher, db as never);
  const order = new OrderService(
    orderRepository,
    orderLineRepository,
    customerRepository,
    productionRepository,
    eventPublisher,
    db as never,
  );
  const production = new ProductionService(productionRepository, eventPublisher, db as never);
  const queue = new ProductionQueueService(
    productionQueueRepository,
    productionRepository,
    orderRepository,
    orderLineRepository,
    eventPublisher,
    db as never,
  );
  const rework = new ReworkService(
    reworkRepository,
    productionRepository,
    orderLineRepository,
    orderRepository,
    eventPublisher,
    db as never,
  );
  const cutting = new CuttingExecutionService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    queue,
    rework,
    eventPublisher,
    db as never,
  );
  const transfer = new ProductionTransferService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    eventPublisher,
    db as never,
  );
  const station = new StationOperationService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    eventPublisher,
    db as never,
  );
  const quality = new QualityControlService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    reworkRepository,
    eventPublisher,
    db as never,
  );
  const dispatch = new DispatchService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    quality,
    eventPublisher,
    db as never,
  );

  return {
    customer,
    order,
    production,
    queue,
    transfer,
    quality,
    dispatch,
    rework,
    cutting,
    station,
  };
}
