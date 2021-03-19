import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1616086231319 implements MigrationInterface {
    name = 'Initial1616086231319'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "favorite" ("userId" integer NOT NULL, "gameId" integer NOT NULL, CONSTRAINT "PK_2e00961d1fa3d924e564f5ac4b2" PRIMARY KEY ("userId", "gameId"))`);
        await queryRunner.query(`CREATE TABLE "screenshot" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "url" text NOT NULL, "verified" boolean NOT NULL DEFAULT false, "gameId" integer, "submitterId" integer, CONSTRAINT "PK_ba03e6a8a41f430189837f84fd9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" text NOT NULL, "profile" text, "password" text NOT NULL, "email" text, "isSubmitter" boolean NOT NULL DEFAULT 'false', "isBanned" boolean NOT NULL DEFAULT 'false', "isVerified" boolean NOT NULL DEFAULT 'false', "isAdmin" boolean NOT NULL DEFAULT 'false', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "post" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "body" text NOT NULL, "gameId" integer, "authorId" integer, CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "game" ("id" SERIAL NOT NULL, "title" text NOT NULL, "author" text, "tags" text, "year" integer, "shortDescription" character varying, "longDescription" character varying, "thumbnail" character varying, "banner" character varying, "submitterId" integer NOT NULL, "favoriteCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0152ed47a9e8963b5aaceb51e77" UNIQUE ("title"), CONSTRAINT "PK_352a30652cd352f552fef73dec5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "download" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "url" text NOT NULL, "verified" boolean NOT NULL DEFAULT false, "gameId" integer, "submitterId" integer, CONSTRAINT "PK_84dcb3c6afdf8b2f9c0b8cd457f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "favorite" ADD CONSTRAINT "FK_83b775fdebbe24c29b2b5831f2d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorite" ADD CONSTRAINT "FK_0983ce35fb2b65296cd6f087482" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "screenshot" ADD CONSTRAINT "FK_af4bee0312c5b82a3d95504a429" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "screenshot" ADD CONSTRAINT "FK_709a8c5b25cdda495f27e5d9a91" FOREIGN KEY ("submitterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post" ADD CONSTRAINT "FK_56ebe74e58a1d0d4e118b11a80f" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post" ADD CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "game" ADD CONSTRAINT "FK_bd1a9b84cb874d5af120b1c57d3" FOREIGN KEY ("submitterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "download" ADD CONSTRAINT "FK_179be5dfad3f7b16e726cd4e344" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "download" ADD CONSTRAINT "FK_a0b4c6962fa38705311a7a2e719" FOREIGN KEY ("submitterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "download" DROP CONSTRAINT "FK_a0b4c6962fa38705311a7a2e719"`);
        await queryRunner.query(`ALTER TABLE "download" DROP CONSTRAINT "FK_179be5dfad3f7b16e726cd4e344"`);
        await queryRunner.query(`ALTER TABLE "game" DROP CONSTRAINT "FK_bd1a9b84cb874d5af120b1c57d3"`);
        await queryRunner.query(`ALTER TABLE "post" DROP CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0"`);
        await queryRunner.query(`ALTER TABLE "post" DROP CONSTRAINT "FK_56ebe74e58a1d0d4e118b11a80f"`);
        await queryRunner.query(`ALTER TABLE "screenshot" DROP CONSTRAINT "FK_709a8c5b25cdda495f27e5d9a91"`);
        await queryRunner.query(`ALTER TABLE "screenshot" DROP CONSTRAINT "FK_af4bee0312c5b82a3d95504a429"`);
        await queryRunner.query(`ALTER TABLE "favorite" DROP CONSTRAINT "FK_0983ce35fb2b65296cd6f087482"`);
        await queryRunner.query(`ALTER TABLE "favorite" DROP CONSTRAINT "FK_83b775fdebbe24c29b2b5831f2d"`);
        await queryRunner.query(`DROP TABLE "download"`);
        await queryRunner.query(`DROP TABLE "game"`);
        await queryRunner.query(`DROP TABLE "post"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "screenshot"`);
        await queryRunner.query(`DROP TABLE "favorite"`);
    }

}
