use voxelize::{Block, FlatlandStage, Registry, Server, Voxelize, WorldConfig};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let mut registry = Registry::new();

    registry.register_blocks(&[
        Block::new("White").id(1).build(),
        Block::new("Black").id(2).build(),
    ]);

    let mut server = Server::new().registry(&registry).build();

    let world = server
        .create_world("main", &WorldConfig::new().build())
        .expect("Failed to create world: main");

    {
        let mut pipeline = world.pipeline_mut();

        let mut flatland = FlatlandStage::new();
        flatland.add_soiling(1, 10);

        pipeline.add_stage(flatland);
    }

    Voxelize::run(server).await
}
