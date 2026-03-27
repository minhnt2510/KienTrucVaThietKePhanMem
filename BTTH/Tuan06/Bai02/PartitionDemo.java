import java.util.Locale;

/**
 * Bai02 demo: Database partitioning concepts (logic only).
 * - Horizontal: route rows to different tables (table_user_01/table_user_02)
 * - Vertical: split columns into core/details tables
 * - Function (logic): decide shard based on a function (hash)
 *
 * Plain Java for javac (no Spring/Maven).
 */
public class PartitionDemo {

    static String horizontalTableByGender(String gender) {
        if (gender == null) return "table_user_02";
        return gender.toLowerCase(Locale.ROOT).equals("nam") ? "table_user_01" : "table_user_02";
    }

    static String[] verticalTables() {
        return new String[] { "user_core(id,name)", "user_details(user_id,bio,address)" };
    }

    static String functionShardByName(String name) {
        if (name == null) name = "";
        int shard = Math.abs(name.hashCode()) % 2;
        return shard == 0 ? "table_user_01" : "table_user_02";
    }

    public static void main(String[] args) {
        System.out.println("=== Bai02: Database partitioning demo ===");

        System.out.println("Horizontal:");
        System.out.println("  Nam -> " + horizontalTableByGender("Nam"));
        System.out.println("  Nu  -> " + horizontalTableByGender("Nu"));

        System.out.println("Vertical:");
        for (String t : verticalTables()) {
            System.out.println("  " + t);
        }

        System.out.println("Function (logic):");
        System.out.println("  An   -> " + functionShardByName("An"));
        System.out.println("  Binh -> " + functionShardByName("Binh"));
    }
}
