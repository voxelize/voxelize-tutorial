use voxelize::{Block, FlatlandStage, Registry, Server, Voxelize, World, WorldConfig};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let dirt = Block::new("Dirt").id(1).build();
    let stone = Block::new("Stone").id(2).build();
    let grass_block = Block::new("Grass Block").id(3).build();

    let config = WorldConfig::new()
        .min_chunk([-1, -1])
        .max_chunk([1, 1])
        .build();

    let mut world = World::new("tutorial", &config);

    {
        let mut pipeline = world.pipeline_mut();
        pipeline.add_stage(
            FlatlandStage::new()
                .add_soiling(stone.id, 10)
                .add_soiling(dirt.id, 2)
                .add_soiling(grass_block.id, 1),
        )
    }

    let mut registry = Registry::new();
    registry.register_blocks(&[dirt, stone, grass_block]);

    let mut server = Server::new().port(4000).registry(&registry).build();

    server
        .add_world(world)
        .expect("Failed to add world to server");

    Voxelize::run(server).await
}
