package com.fitly.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.fitly.app.data.local.entity.*
import com.fitly.app.data.util.AppConstants

@Database(
    entities = [
        ClothingItemEntity::class,
        OutfitEntity::class,
        WearLogEntity::class,
        PlannedOutfitEntity::class,
        TripEntity::class,
        TagEntity::class,
        LocationEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class FitlyDatabase : RoomDatabase() {
    abstract fun fitlyDao(): FitlyDao

    companion object {
        @Volatile
        private var INSTANCE: FitlyDatabase? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE items ADD COLUMN sparkJoy TEXT")
                db.execSQL("ALTER TABLE items ADD COLUMN gratitudeNote TEXT")
                db.execSQL("ALTER TABLE wear_logs ADD COLUMN type TEXT NOT NULL DEFAULT 'wear'")
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS planned_outfits (
                        id TEXT NOT NULL PRIMARY KEY,
                        date TEXT NOT NULL,
                        outfitId TEXT,
                        itemIds TEXT NOT NULL DEFAULT '[]',
                        note TEXT,
                        createdAt INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS trips (
                        id TEXT NOT NULL PRIMARY KEY,
                        name TEXT NOT NULL,
                        destination TEXT,
                        startDate TEXT NOT NULL,
                        endDate TEXT NOT NULL,
                        itemIds TEXT NOT NULL DEFAULT '[]',
                        outfitIds TEXT NOT NULL DEFAULT '[]',
                        packedItemIds TEXT NOT NULL DEFAULT '[]',
                        completed INTEGER NOT NULL DEFAULT 0,
                        createdAt INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
            }
        }

        fun closeAndReset() {
            synchronized(this) {
                if (INSTANCE?.isOpen == true) {
                    INSTANCE?.close()
                }
                INSTANCE = null
            }
        }

        fun getDatabase(context: Context): FitlyDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    FitlyDatabase::class.java,
                    AppConstants.DATABASE_NAME
                )
                    .addMigrations(MIGRATION_1_2)
                    .fallbackToDestructiveMigration(dropAllTables = false)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
